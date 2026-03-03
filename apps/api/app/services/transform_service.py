from __future__ import annotations

from typing import Any

from app.models.transform import TransformResult, TransformSuggestion
from app.services.duckdb_service import DuckDBService


def get_suggestions(
    table_name: str,
    duckdb_service: DuckDBService,
) -> list[TransformSuggestion]:
    """Analyze the table schema and data to suggest useful transforms.

    Returns a list of context-aware suggestions such as filtering out
    cancelled orders, creating calculated columns, or aggregating by date.
    """
    schema = duckdb_service.get_schema(table_name)
    stats = duckdb_service.get_column_stats(table_name)
    suggestions: list[TransformSuggestion] = []

    col_names_lower = {col["name"].lower(): col["name"] for col in schema}
    col_types = {col["name"]: col["type"] for col in schema}

    # --- Suggest filtering cancelled / inactive rows ---
    status_columns = [
        col for col in schema
        if any(kw in col["name"].lower() for kw in ("status", "state", "active", "cancelled", "canceled"))
    ]
    for col in status_columns:
        samples = col.get("sample_values", [])
        cancel_vals = [v for v in samples if isinstance(v, str) and v.lower() in ("cancelled", "canceled", "inactive", "deleted")]
        if cancel_vals:
            val = cancel_vals[0]
            suggestions.append(
                TransformSuggestion(
                    name=f"Filter out {val.lower()} rows",
                    description=f"Remove rows where {col['name']} = '{val}'",
                    transform_type="filter",
                    params={
                        "column": col["name"],
                        "operator": "!=",
                        "value": val,
                    },
                    sql_preview=f"SELECT * FROM {table_name} WHERE \"{col['name']}\" != '{val}'",
                )
            )

    # --- Suggest calculated columns (price * quantity) ---
    numeric_cols = [
        col["name"] for col in schema
        if col["type"] in ("INTEGER", "BIGINT", "DOUBLE", "FLOAT", "DECIMAL", "HUGEINT")
    ]
    price_cols = [c for c in numeric_cols if any(kw in c.lower() for kw in ("price", "unit_price", "cost"))]
    qty_cols = [c for c in numeric_cols if any(kw in c.lower() for kw in ("quantity", "qty", "units", "amount"))]
    if price_cols and qty_cols:
        p = price_cols[0]
        q = qty_cols[0]
        suggestions.append(
            TransformSuggestion(
                name="Calculate total amount",
                description=f"Create a new column: {p} x {q}",
                transform_type="calculate",
                params={
                    "expression": f'"{p}" * "{q}"',
                    "new_column": "total_amount",
                },
                sql_preview=f'SELECT *, "{p}" * "{q}" AS total_amount FROM {table_name}',
            )
        )

    # --- Suggest aggregation by date ---
    date_cols = [
        col["name"] for col in schema
        if col["type"] in ("DATE", "TIMESTAMP", "TIMESTAMP WITH TIME ZONE")
        or "date" in col["name"].lower()
    ]
    if date_cols and numeric_cols:
        date_col = date_cols[0]
        num_col = numeric_cols[0]
        suggestions.append(
            TransformSuggestion(
                name=f"Aggregate by {date_col} (monthly)",
                description=f"Sum {num_col} grouped by month of {date_col}",
                transform_type="aggregate",
                params={
                    "group_by": [f"DATE_TRUNC('month', \"{date_col}\")"],
                    "aggregation_column": num_col,
                    "aggregation_function": "SUM",
                },
                sql_preview=(
                    f"SELECT DATE_TRUNC('month', \"{date_col}\") AS month, "
                    f"SUM(\"{num_col}\") AS total_{num_col.lower()} "
                    f"FROM {table_name} GROUP BY 1 ORDER BY 1"
                ),
            )
        )

    # --- Suggest aggregation by categorical columns ---
    categorical_cols = [
        s for s in stats
        if s["type"] in ("VARCHAR", "TEXT")
        and 2 <= s.get("distinct_count", 0) <= 20
    ]
    for cat in categorical_cols[:2]:
        if numeric_cols:
            num_col = numeric_cols[0]
            suggestions.append(
                TransformSuggestion(
                    name=f"Aggregate by {cat['name']}",
                    description=f"Sum {num_col} grouped by {cat['name']}",
                    transform_type="aggregate",
                    params={
                        "group_by": [cat["name"]],
                        "aggregation_column": num_col,
                        "aggregation_function": "SUM",
                    },
                    sql_preview=(
                        f"SELECT \"{cat['name']}\", SUM(\"{num_col}\") AS total_{num_col.lower()} "
                        f"FROM {table_name} GROUP BY 1 ORDER BY 2 DESC"
                    ),
                )
            )

    # --- Suggest removing null-heavy columns ---
    for s in stats:
        total_rows_result = duckdb_service.execute_query(f"SELECT COUNT(*) as c FROM {table_name}")
        total_rows = total_rows_result["rows"][0][0] if total_rows_result["rows"] else 0
        if total_rows > 0 and s.get("null_count", 0) / total_rows > 0.5:
            keep_cols = [c["name"] for c in schema if c["name"] != s["name"]]
            col_list = ", ".join('"{}"'.format(c) for c in keep_cols)
            suggestions.append(
                TransformSuggestion(
                    name=f"Drop column {s['name']}",
                    description=f"{s['name']} has {s['null_count']} null values ({round(s['null_count'] / total_rows * 100)}% missing)",
                    transform_type="sql",
                    params={},
                    sql_preview=f"SELECT {col_list} FROM {table_name}",
                )
            )

    return suggestions


def apply_filter(
    source_table: str,
    column: str,
    operator: str,
    value: Any,
    target_table: str | None,
    duckdb_service: DuckDBService,
) -> TransformResult:
    """Apply a filter transform to a table.

    Supported operators: =, !=, >, <, >=, <=, LIKE, IN, IS NULL, IS NOT NULL.
    """
    allowed_ops = {"=", "!=", ">", "<", ">=", "<=", "LIKE", "IN", "IS NULL", "IS NOT NULL"}
    op_upper = operator.upper().strip()
    if op_upper not in allowed_ops:
        raise ValueError(f"Unsupported operator: {operator}")

    if target_table is None:
        target_table = f"{source_table}_filtered"

    if op_upper in ("IS NULL", "IS NOT NULL"):
        where_clause = f'"{column}" {op_upper}'
    elif op_upper == "IN":
        if isinstance(value, list):
            in_vals = ", ".join(f"'{v}'" if isinstance(v, str) else str(v) for v in value)
        else:
            in_vals = str(value)
        where_clause = f'"{column}" IN ({in_vals})'
    elif op_upper == "LIKE":
        where_clause = f'"{column}" LIKE \'{value}\''
    elif isinstance(value, str):
        where_clause = f'"{column}" {op_upper} \'{value}\''
    else:
        where_clause = f'"{column}" {op_upper} {value}'

    sql = f"SELECT * FROM {source_table} WHERE {where_clause}"
    result = duckdb_service.apply_transform(sql, target_table)

    return TransformResult(
        table_name=result["table_name"],
        row_count=result["row_count"],
        column_count=result["column_count"],
        columns=result["columns"],
    )


def apply_aggregation(
    source_table: str,
    group_by_cols: list[str],
    agg_col: str,
    agg_func: str,
    target_table: str | None,
    duckdb_service: DuckDBService,
) -> TransformResult:
    """Apply an aggregation transform to a table.

    Supported aggregation functions: SUM, AVG, COUNT, MIN, MAX.
    """
    allowed_funcs = {"SUM", "AVG", "COUNT", "MIN", "MAX"}
    func_upper = agg_func.upper().strip()
    if func_upper not in allowed_funcs:
        raise ValueError(f"Unsupported aggregation function: {agg_func}")

    if target_table is None:
        target_table = f"{source_table}_aggregated"

    group_exprs = ", ".join(f'"{g}"' for g in group_by_cols)
    alias = f"{func_upper.lower()}_{agg_col.lower()}"
    sql = (
        f"SELECT {group_exprs}, {func_upper}(\"{agg_col}\") AS {alias} "
        f"FROM {source_table} GROUP BY {group_exprs} ORDER BY {group_exprs}"
    )

    result = duckdb_service.apply_transform(sql, target_table)

    return TransformResult(
        table_name=result["table_name"],
        row_count=result["row_count"],
        column_count=result["column_count"],
        columns=result["columns"],
    )


def apply_sql_transform(
    sql: str,
    target_table: str,
    duckdb_service: DuckDBService,
) -> TransformResult:
    """Apply an arbitrary SQL SELECT as a transform, storing results in target_table."""
    cleaned = sql.strip().rstrip(";")
    if not DuckDBService._is_safe_query(cleaned):
        raise ValueError("Only SELECT / WITH queries are allowed in transforms")

    result = duckdb_service.apply_transform(cleaned, target_table)

    return TransformResult(
        table_name=result["table_name"],
        row_count=result["row_count"],
        column_count=result["column_count"],
        columns=result["columns"],
    )
