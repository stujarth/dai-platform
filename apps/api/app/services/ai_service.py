from __future__ import annotations

import json
from typing import Any, AsyncIterator

import anthropic

from app.services.duckdb_service import DuckDBService
from app.services import report_service

# ---------------------------------------------------------------------------
# Tool definitions for Claude function-calling
# ---------------------------------------------------------------------------

TOOLS = [
    {
        "name": "query_data",
        "description": (
            "Execute a SQL SELECT query against the data warehouse and return the results. "
            "Use this to answer questions about the data, compute aggregations, filter rows, etc. "
            "Only SELECT and WITH queries are allowed."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "sql": {
                    "type": "string",
                    "description": "A SQL SELECT query to execute against DuckDB.",
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of rows to return. Default 100.",
                    "default": 100,
                },
            },
            "required": ["sql"],
        },
    },
    {
        "name": "describe_table",
        "description": (
            "Get the schema information (column names, types, sample values) for a table. "
            "Use this when you need to understand the structure of the data before writing queries."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "table_name": {
                    "type": "string",
                    "description": "Name of the table to describe.",
                },
            },
            "required": ["table_name"],
        },
    },
    {
        "name": "suggest_chart",
        "description": (
            "Generate an ECharts chart configuration for visualizing data. "
            "Returns a complete ECharts option object that can be rendered directly. "
            "Use this when the user asks to visualize or chart something."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "table_name": {
                    "type": "string",
                    "description": "Source table name.",
                },
                "chart_type": {
                    "type": "string",
                    "enum": ["bar", "line", "pie", "scatter", "area"],
                    "description": "Type of chart to generate.",
                },
                "x_column": {
                    "type": "string",
                    "description": "Column to use for the x-axis or labels.",
                },
                "y_column": {
                    "type": "string",
                    "description": "Column to use for the y-axis or values.",
                },
                "aggregation": {
                    "type": "string",
                    "enum": ["sum", "avg", "count", "min", "max"],
                    "description": "Aggregation function to apply. Default 'sum'.",
                    "default": "sum",
                },
            },
            "required": ["table_name", "chart_type", "x_column", "y_column"],
        },
    },
    {
        "name": "suggest_transform",
        "description": (
            "Suggest and generate a SQL transformation for the data. "
            "Returns the SQL query and a description of what it does. "
            "Use this when the user wants to clean, reshape, or transform data."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "table_name": {
                    "type": "string",
                    "description": "Source table name.",
                },
                "description": {
                    "type": "string",
                    "description": "Natural language description of the desired transformation.",
                },
            },
            "required": ["table_name", "description"],
        },
    },
]


class AIService:
    """Claude AI integration service with tool use / function calling."""

    def __init__(
        self,
        client: anthropic.Anthropic | None,
        duckdb_service: DuckDBService,
        model: str = "claude-sonnet-4-20250514",
    ):
        self.client = client
        self.duckdb = duckdb_service
        self.model = model

    # ------------------------------------------------------------------
    # System prompt
    # ------------------------------------------------------------------

    def _build_system_prompt(self, context: dict[str, Any]) -> str:
        """Build a context-aware system prompt.

        The context dict may include:
          - wizard_step: current step in the onboarding wizard
          - table_name: the active table name
          - table_schema: schema info for the active table
        """
        wizard_step = context.get("wizard_step", "")
        table_name = context.get("table_name", "")

        # Get live schema if a table is active
        schema_text = ""
        if table_name:
            try:
                schema = self.duckdb.get_schema(table_name)
                schema_lines = [f"  - {c['name']} ({c['type']})" for c in schema]
                schema_text = f"\nActive table: {table_name}\nColumns:\n" + "\n".join(schema_lines)
            except Exception:
                schema_text = f"\nActive table: {table_name} (schema unavailable)"

        # Available tables
        try:
            tables = self.duckdb.get_tables()
            table_list = ", ".join(t["name"] for t in tables) if tables else "(no tables loaded)"
        except Exception:
            table_list = "(unknown)"

        # Step-specific guidance
        step_guidance = ""
        if wizard_step == "connect":
            step_guidance = (
                "\nThe user is on the data connection step. Help them choose a data source, "
                "upload a CSV, or explore sample data. You can describe what tables are available."
            )
        elif wizard_step == "explore":
            step_guidance = (
                "\nThe user is exploring their data. Help them understand the schema, preview data, "
                "run queries, and discover patterns. Use the query_data and describe_table tools."
            )
        elif wizard_step == "transform":
            step_guidance = (
                "\nThe user is on the transform step. Help them clean, filter, aggregate, and reshape "
                "their data. Suggest useful transforms and generate SQL using suggest_transform."
            )
        elif wizard_step == "visualize":
            step_guidance = (
                "\nThe user is building visualizations. Help them create charts, dashboards, and "
                "reports. Use the suggest_chart tool to generate ECharts configurations."
            )

        return (
            "You are DAI, a friendly and expert data analyst AI assistant. "
            "You help users connect data sources, explore and understand their data, "
            "apply transformations, and create beautiful visualizations.\n"
            "\n"
            "You have access to tools that let you query data with SQL, inspect table schemas, "
            "generate charts, and suggest data transforms. Use them proactively.\n"
            "\n"
            "Guidelines:\n"
            "- Be concise but thorough. Show key numbers and insights.\n"
            "- When the user asks about data, query it rather than guessing.\n"
            "- For visualizations, use the suggest_chart tool to produce ECharts configs.\n"
            "- When suggesting SQL, always use double-quoted column names.\n"
            "- Format numbers nicely (commas, 2 decimal places for money).\n"
            "- If you don't know something, say so honestly.\n"
            f"\nAvailable tables: {table_list}"
            f"{schema_text}"
            f"{step_guidance}"
        )

    # ------------------------------------------------------------------
    # Tool execution
    # ------------------------------------------------------------------

    def _execute_tool(self, tool_name: str, tool_input: dict[str, Any]) -> dict[str, Any]:
        """Execute a tool call and return the result."""
        try:
            if tool_name == "query_data":
                result = self.duckdb.execute_query(
                    tool_input["sql"],
                    limit=tool_input.get("limit", 100),
                )
                # Trim large results for the context window
                if len(result["rows"]) > 50:
                    result["rows"] = result["rows"][:50]
                    result["note"] = "Results truncated to 50 rows"
                return result

            elif tool_name == "describe_table":
                schema = self.duckdb.get_schema(tool_input["table_name"])
                stats = self.duckdb.get_column_stats(tool_input["table_name"])
                return {"schema": schema, "stats": stats}

            elif tool_name == "suggest_chart":
                chart = report_service.generate_chart(
                    table_name=tool_input["table_name"],
                    chart_type=tool_input["chart_type"],
                    x_col=tool_input["x_column"],
                    y_col=tool_input["y_column"],
                    agg=tool_input.get("aggregation", "sum"),
                    duckdb_service=self.duckdb,
                )
                return chart.model_dump()

            elif tool_name == "suggest_transform":
                table_name = tool_input["table_name"]
                description = tool_input["description"]
                schema = self.duckdb.get_schema(table_name)
                col_info = ", ".join(f"{c['name']} ({c['type']})" for c in schema)
                return {
                    "table_name": table_name,
                    "description": description,
                    "columns": col_info,
                    "hint": (
                        f"Generate a SQL SELECT query against '{table_name}' that accomplishes: {description}. "
                        f"Available columns: {col_info}"
                    ),
                }

            else:
                return {"error": f"Unknown tool: {tool_name}"}

        except Exception as e:
            return {"error": str(e)}

    # ------------------------------------------------------------------
    # Streaming chat
    # ------------------------------------------------------------------

    async def chat_stream(
        self,
        message: str,
        history: list[dict[str, str]],
        context: dict[str, Any],
    ) -> AsyncIterator[dict[str, Any]]:
        """Async generator that yields streaming response chunks.

        Yields dicts with:
          - {"type": "text", "content": "..."} for text deltas
          - {"type": "tool_call", "name": "...", "input": {...}} when a tool is invoked
          - {"type": "tool_result", "name": "...", "result": {...}} after tool execution
          - {"type": "error", "content": "..."} on errors
          - {"type": "done"} at the end
        """
        if not self.client:
            yield {
                "type": "text",
                "content": (
                    "I'm running without an API key, so I can't use Claude AI features right now. "
                    "To enable AI assistance, set the `ANTHROPIC_API_KEY` environment variable and restart the server.\n\n"
                    "In the meantime, you can still:\n"
                    "- Upload and explore your data using the sidebar\n"
                    "- Apply transforms from the suggestions panel\n"
                    "- Generate charts and dashboards from the Visualize tab"
                ),
            }
            yield {"type": "done"}
            return

        system_prompt = self._build_system_prompt(context)

        # Build messages list from history
        messages: list[dict[str, Any]] = []
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": message})

        try:
            # Agentic loop: keep going while Claude wants to use tools
            max_iterations = 10
            iteration = 0

            while iteration < max_iterations:
                iteration += 1

                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=4096,
                    system=system_prompt,
                    messages=messages,
                    tools=TOOLS,
                )

                # Process each content block
                assistant_content: list[dict[str, Any]] = []
                has_tool_use = False

                for block in response.content:
                    if block.type == "text":
                        assistant_content.append({"type": "text", "text": block.text})
                        yield {"type": "text", "content": block.text}

                    elif block.type == "tool_use":
                        has_tool_use = True
                        tool_name = block.name
                        tool_input = block.input
                        tool_use_id = block.id

                        assistant_content.append({
                            "type": "tool_use",
                            "id": tool_use_id,
                            "name": tool_name,
                            "input": tool_input,
                        })

                        yield {
                            "type": "tool_call",
                            "name": tool_name,
                            "input": tool_input,
                        }

                        # Execute the tool
                        tool_result = self._execute_tool(tool_name, tool_input)

                        yield {
                            "type": "tool_result",
                            "name": tool_name,
                            "result": tool_result,
                        }

                        # Add the assistant message and tool result to conversation
                        messages.append({"role": "assistant", "content": assistant_content})
                        messages.append({
                            "role": "user",
                            "content": [
                                {
                                    "type": "tool_result",
                                    "tool_use_id": tool_use_id,
                                    "content": json.dumps(tool_result, default=str),
                                }
                            ],
                        })
                        # Reset for the next iteration
                        assistant_content = []
                        break  # Break inner loop, continue outer while loop

                # If no tool was used, we're done
                if not has_tool_use:
                    break

            yield {"type": "done"}

        except anthropic.APIError as e:
            yield {"type": "error", "content": f"Claude API error: {str(e)}"}
            yield {"type": "done"}
        except Exception as e:
            yield {"type": "error", "content": f"Unexpected error: {str(e)}"}
            yield {"type": "done"}

    # ------------------------------------------------------------------
    # Quick suggestions (non-streaming)
    # ------------------------------------------------------------------

    def get_suggestions(self, context: dict[str, Any]) -> list[dict[str, str]]:
        """Return contextual quick-action suggestions based on wizard step."""
        wizard_step = context.get("wizard_step", "")
        table_name = context.get("table_name", "")

        if wizard_step == "connect":
            return [
                {"text": "What sample datasets are available?", "category": "explore"},
                {"text": "Help me upload a CSV file", "category": "action"},
                {"text": "What data formats do you support?", "category": "info"},
            ]

        if wizard_step == "explore" and table_name:
            return [
                {"text": f"Describe the {table_name} table", "category": "explore"},
                {"text": f"Show me the first 10 rows of {table_name}", "category": "explore"},
                {"text": f"What are the key statistics for {table_name}?", "category": "analyze"},
                {"text": f"Are there any data quality issues in {table_name}?", "category": "analyze"},
            ]

        if wizard_step == "transform" and table_name:
            return [
                {"text": f"Suggest transforms for {table_name}", "category": "action"},
                {"text": f"Filter out null values in {table_name}", "category": "action"},
                {"text": f"Aggregate {table_name} by the most logical grouping", "category": "action"},
                {"text": "Help me write a custom SQL transform", "category": "action"},
            ]

        if wizard_step == "visualize" and table_name:
            return [
                {"text": f"Create a dashboard for {table_name}", "category": "action"},
                {"text": f"What's the best chart for {table_name}?", "category": "explore"},
                {"text": f"Show me trends over time in {table_name}", "category": "action"},
                {"text": f"Compare categories in {table_name}", "category": "action"},
            ]

        # Default suggestions
        return [
            {"text": "Help me get started", "category": "info"},
            {"text": "What can you do?", "category": "info"},
            {"text": "Show me available data sources", "category": "explore"},
        ]
