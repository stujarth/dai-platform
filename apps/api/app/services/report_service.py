from __future__ import annotations

import uuid
from typing import Any

from app.models.report import ChartConfig, DashboardConfig, MetricConfig
from app.services.duckdb_service import DuckDBService

ECHARTS_COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#84cc16",
]

NUMERIC_TYPES = {"INTEGER", "BIGINT", "DOUBLE", "FLOAT", "DECIMAL", "HUGEINT", "SMALLINT", "TINYINT"}
DATE_TYPES = {"DATE", "TIMESTAMP", "TIMESTAMP WITH TIME ZONE", "TIMESTAMPTZ"}


def suggest_charts(
    table_name: str,
    duckdb_service: DuckDBService,
) -> list[ChartConfig]:
    """Analyze columns and suggest appropriate chart types.

    Heuristics:
      - date + numeric -> line chart
      - categorical (low cardinality) + numeric -> bar chart
      - single categorical -> pie chart
      - two numeric columns -> scatter chart
    """
    schema = duckdb_service.get_schema(table_name)
    stats = duckdb_service.get_column_stats(table_name)

    stat_map = {s["name"]: s for s in stats}
    suggestions: list[ChartConfig] = []

    date_cols = [c for c in schema if c["type"].upper() in DATE_TYPES or "date" in c["name"].lower()]
    numeric_cols = [c for c in schema if c["type"].upper() in NUMERIC_TYPES]
    categorical_cols = [
        c for c in schema
        if c["type"].upper() in ("VARCHAR", "TEXT")
        and 2 <= stat_map.get(c["name"], {}).get("distinct_count", 0) <= 30
    ]

    # date + numeric -> line chart
    for dc in date_cols[:1]:
        for nc in numeric_cols[:2]:
            option = _build_line_chart(table_name, dc["name"], nc["name"], duckdb_service)
            suggestions.append(
                ChartConfig(
                    id=_id(),
                    title=f"{nc['name'].replace('_', ' ').title()} Over Time",
                    chart_type="line",
                    echarts_option=option,
                    data_query=f'SELECT "{dc["name"]}", SUM("{nc["name"]}") FROM {table_name} GROUP BY 1 ORDER BY 1',
                    summary=f"Line chart showing {nc['name']} trends over {dc['name']}",
                )
            )

    # categorical + numeric -> bar chart
    for cc in categorical_cols[:2]:
        for nc in numeric_cols[:1]:
            option = _build_bar_chart(table_name, cc["name"], nc["name"], duckdb_service)
            suggestions.append(
                ChartConfig(
                    id=_id(),
                    title=f"{nc['name'].replace('_', ' ').title()} by {cc['name'].replace('_', ' ').title()}",
                    chart_type="bar",
                    echarts_option=option,
                    data_query=f'SELECT "{cc["name"]}", SUM("{nc["name"]}") FROM {table_name} GROUP BY 1 ORDER BY 2 DESC',
                    summary=f"Bar chart comparing {nc['name']} across {cc['name']} categories",
                )
            )

    # single categorical -> pie chart
    for cc in categorical_cols[:1]:
        option = _build_pie_chart(table_name, cc["name"], numeric_cols[0]["name"] if numeric_cols else None, duckdb_service)
        y_label = numeric_cols[0]["name"] if numeric_cols else "count"
        suggestions.append(
            ChartConfig(
                id=_id(),
                title=f"Distribution by {cc['name'].replace('_', ' ').title()}",
                chart_type="pie",
                echarts_option=option,
                data_query=f'SELECT "{cc["name"]}", COUNT(*) FROM {table_name} GROUP BY 1',
                summary=f"Pie chart showing distribution of {cc['name']}",
            )
        )

    # two numeric -> scatter
    if len(numeric_cols) >= 2:
        option = _build_scatter_chart(table_name, numeric_cols[0]["name"], numeric_cols[1]["name"], duckdb_service)
        suggestions.append(
            ChartConfig(
                id=_id(),
                title=f"{numeric_cols[0]['name'].replace('_', ' ').title()} vs {numeric_cols[1]['name'].replace('_', ' ').title()}",
                chart_type="scatter",
                echarts_option=option,
                data_query=f'SELECT "{numeric_cols[0]["name"]}", "{numeric_cols[1]["name"]}" FROM {table_name} LIMIT 500',
                summary=f"Scatter plot of {numeric_cols[0]['name']} against {numeric_cols[1]['name']}",
            )
        )

    return suggestions


def generate_chart(
    table_name: str,
    chart_type: str,
    x_col: str,
    y_col: str,
    agg: str,
    duckdb_service: DuckDBService,
    title: str = "",
) -> ChartConfig:
    """Generate a single chart configuration by querying data and building ECharts options."""
    builders = {
        "line": _build_line_chart,
        "area": _build_line_chart,
        "bar": _build_bar_chart,
        "pie": _build_pie_chart,
        "scatter": _build_scatter_chart,
    }

    builder = builders.get(chart_type, _build_bar_chart)

    if chart_type == "pie":
        option = builder(table_name, x_col, y_col, duckdb_service, agg=agg)
    elif chart_type == "scatter":
        option = builder(table_name, x_col, y_col, duckdb_service)
    else:
        option = builder(table_name, x_col, y_col, duckdb_service, agg=agg)

    if chart_type == "area" and "series" in option:
        for s in option["series"]:
            s["areaStyle"] = {"opacity": 0.15}

    auto_title = title or f"{y_col.replace('_', ' ').title()} by {x_col.replace('_', ' ').title()}"

    return ChartConfig(
        id=_id(),
        title=auto_title,
        chart_type=chart_type,
        echarts_option=option,
        data_query=f'SELECT "{x_col}", {agg.upper()}("{y_col}") FROM {table_name} GROUP BY 1 ORDER BY 1',
        summary=f"{chart_type.title()} chart: {agg}({y_col}) grouped by {x_col}",
    )


def generate_dashboard(
    table_name: str,
    duckdb_service: DuckDBService,
) -> DashboardConfig:
    """Auto-generate a full dashboard with metric cards and charts."""
    schema = duckdb_service.get_schema(table_name)
    stats = duckdb_service.get_column_stats(table_name)
    stat_map = {s["name"]: s for s in stats}

    metrics = _build_metric_cards(table_name, schema, stats, duckdb_service)
    charts = suggest_charts(table_name, duckdb_service)

    # Limit to 4-6 charts for a clean dashboard
    charts = charts[:6]

    return DashboardConfig(charts=charts, metrics=metrics)


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


def _build_line_chart(
    table_name: str,
    x_col: str,
    y_col: str,
    duckdb_service: DuckDBService,
    agg: str = "SUM",
) -> dict[str, Any]:
    """Build an ECharts line chart option dict."""
    agg = agg.upper()
    sql = (
        f'SELECT CAST("{x_col}" AS VARCHAR) AS x, {agg}("{y_col}") AS y '
        f'FROM {table_name} WHERE "{x_col}" IS NOT NULL '
        f"GROUP BY 1 ORDER BY 1 LIMIT 200"
    )
    result = duckdb_service.execute_query(sql)
    x_data = [r[0] for r in result["rows"]]
    y_data = [r[1] for r in result["rows"]]

    return {
        "color": ECHARTS_COLORS,
        "tooltip": {
            "trigger": "axis",
            "backgroundColor": "rgba(255,255,255,0.95)",
            "borderColor": "#e5e7eb",
            "borderWidth": 1,
            "textStyle": {"color": "#1f2937", "fontSize": 13},
        },
        "grid": {"left": 60, "right": 30, "top": 30, "bottom": 40, "containLabel": True},
        "xAxis": {
            "type": "category",
            "data": x_data,
            "axisLine": {"lineStyle": {"color": "#d1d5db"}},
            "axisLabel": {"color": "#6b7280", "fontSize": 11},
        },
        "yAxis": {
            "type": "value",
            "axisLine": {"show": False},
            "splitLine": {"lineStyle": {"color": "#f3f4f6"}},
            "axisLabel": {"color": "#6b7280", "fontSize": 11},
        },
        "series": [
            {
                "name": y_col.replace("_", " ").title(),
                "type": "line",
                "data": y_data,
                "smooth": True,
                "symbol": "circle",
                "symbolSize": 6,
                "lineStyle": {"width": 2.5},
                "areaStyle": {"opacity": 0.08},
                "itemStyle": {"color": ECHARTS_COLORS[0]},
            }
        ],
    }


def _build_bar_chart(
    table_name: str,
    x_col: str,
    y_col: str,
    duckdb_service: DuckDBService,
    agg: str = "SUM",
) -> dict[str, Any]:
    """Build an ECharts bar chart option dict."""
    agg = agg.upper()
    sql = (
        f'SELECT CAST("{x_col}" AS VARCHAR) AS x, {agg}("{y_col}") AS y '
        f'FROM {table_name} WHERE "{x_col}" IS NOT NULL '
        f"GROUP BY 1 ORDER BY 2 DESC LIMIT 20"
    )
    result = duckdb_service.execute_query(sql)
    x_data = [r[0] for r in result["rows"]]
    y_data = [r[1] for r in result["rows"]]

    return {
        "color": ECHARTS_COLORS,
        "tooltip": {
            "trigger": "axis",
            "axisPointer": {"type": "shadow"},
            "backgroundColor": "rgba(255,255,255,0.95)",
            "borderColor": "#e5e7eb",
            "borderWidth": 1,
            "textStyle": {"color": "#1f2937", "fontSize": 13},
        },
        "grid": {"left": 60, "right": 30, "top": 30, "bottom": 40, "containLabel": True},
        "xAxis": {
            "type": "category",
            "data": x_data,
            "axisLine": {"lineStyle": {"color": "#d1d5db"}},
            "axisLabel": {"color": "#6b7280", "fontSize": 11, "rotate": 30 if len(x_data) > 6 else 0},
        },
        "yAxis": {
            "type": "value",
            "axisLine": {"show": False},
            "splitLine": {"lineStyle": {"color": "#f3f4f6"}},
            "axisLabel": {"color": "#6b7280", "fontSize": 11},
        },
        "series": [
            {
                "name": y_col.replace("_", " ").title(),
                "type": "bar",
                "data": y_data,
                "barMaxWidth": 50,
                "itemStyle": {
                    "borderRadius": [6, 6, 0, 0],
                    "color": ECHARTS_COLORS[0],
                },
                "emphasis": {
                    "itemStyle": {"color": ECHARTS_COLORS[1]},
                },
            }
        ],
    }


def _build_pie_chart(
    table_name: str,
    label_col: str,
    value_col: str | None,
    duckdb_service: DuckDBService,
    agg: str = "SUM",
) -> dict[str, Any]:
    """Build an ECharts pie chart option dict."""
    if value_col:
        agg = agg.upper()
        sql = (
            f'SELECT CAST("{label_col}" AS VARCHAR) AS name, {agg}("{value_col}") AS value '
            f"FROM {table_name} GROUP BY 1 ORDER BY 2 DESC LIMIT 10"
        )
    else:
        sql = (
            f'SELECT CAST("{label_col}" AS VARCHAR) AS name, COUNT(*) AS value '
            f"FROM {table_name} GROUP BY 1 ORDER BY 2 DESC LIMIT 10"
        )
    result = duckdb_service.execute_query(sql)
    pie_data = [{"name": r[0], "value": r[1]} for r in result["rows"]]

    return {
        "color": ECHARTS_COLORS,
        "tooltip": {
            "trigger": "item",
            "formatter": "{b}: {c} ({d}%)",
            "backgroundColor": "rgba(255,255,255,0.95)",
            "borderColor": "#e5e7eb",
            "borderWidth": 1,
            "textStyle": {"color": "#1f2937", "fontSize": 13},
        },
        "legend": {
            "orient": "vertical",
            "right": 10,
            "top": "center",
            "textStyle": {"color": "#6b7280", "fontSize": 12},
        },
        "series": [
            {
                "name": label_col.replace("_", " ").title(),
                "type": "pie",
                "radius": ["40%", "70%"],
                "center": ["40%", "50%"],
                "avoidLabelOverlap": True,
                "itemStyle": {
                    "borderRadius": 8,
                    "borderColor": "#fff",
                    "borderWidth": 2,
                },
                "label": {
                    "show": True,
                    "formatter": "{b}: {d}%",
                    "fontSize": 12,
                    "color": "#374151",
                },
                "emphasis": {
                    "label": {"show": True, "fontSize": 14, "fontWeight": "bold"},
                    "itemStyle": {"shadowBlur": 10, "shadowColor": "rgba(0,0,0,0.15)"},
                },
                "data": pie_data,
            }
        ],
    }


def _build_scatter_chart(
    table_name: str,
    x_col: str,
    y_col: str,
    duckdb_service: DuckDBService,
) -> dict[str, Any]:
    """Build an ECharts scatter chart option dict."""
    sql = (
        f'SELECT "{x_col}", "{y_col}" '
        f'FROM {table_name} WHERE "{x_col}" IS NOT NULL AND "{y_col}" IS NOT NULL '
        f"LIMIT 500"
    )
    result = duckdb_service.execute_query(sql)
    scatter_data = [[r[0], r[1]] for r in result["rows"]]

    return {
        "color": ECHARTS_COLORS,
        "tooltip": {
            "trigger": "item",
            "formatter": f"{x_col}: {{c[0]}}<br/>{y_col}: {{c[1]}}",
            "backgroundColor": "rgba(255,255,255,0.95)",
            "borderColor": "#e5e7eb",
            "borderWidth": 1,
            "textStyle": {"color": "#1f2937", "fontSize": 13},
        },
        "grid": {"left": 60, "right": 30, "top": 30, "bottom": 50, "containLabel": True},
        "xAxis": {
            "type": "value",
            "name": x_col.replace("_", " ").title(),
            "nameLocation": "center",
            "nameGap": 30,
            "nameTextStyle": {"color": "#6b7280", "fontSize": 12},
            "axisLine": {"lineStyle": {"color": "#d1d5db"}},
            "splitLine": {"lineStyle": {"color": "#f3f4f6"}},
            "axisLabel": {"color": "#6b7280", "fontSize": 11},
        },
        "yAxis": {
            "type": "value",
            "name": y_col.replace("_", " ").title(),
            "nameLocation": "center",
            "nameGap": 45,
            "nameTextStyle": {"color": "#6b7280", "fontSize": 12},
            "axisLine": {"show": False},
            "splitLine": {"lineStyle": {"color": "#f3f4f6"}},
            "axisLabel": {"color": "#6b7280", "fontSize": 11},
        },
        "series": [
            {
                "type": "scatter",
                "data": scatter_data,
                "symbolSize": 8,
                "itemStyle": {
                    "color": ECHARTS_COLORS[4],
                    "opacity": 0.7,
                    "borderColor": "#fff",
                    "borderWidth": 1,
                },
                "emphasis": {
                    "itemStyle": {"opacity": 1, "shadowBlur": 8, "shadowColor": "rgba(0,0,0,0.2)"},
                },
            }
        ],
    }


def _build_metric_cards(
    table_name: str,
    schema: list[dict[str, Any]],
    stats: list[dict[str, Any]],
    duckdb_service: DuckDBService,
) -> list[MetricConfig]:
    """Build summary metric cards for the dashboard."""
    metrics: list[MetricConfig] = []

    # Total row count
    total_result = duckdb_service.execute_query(f"SELECT COUNT(*) FROM {table_name}")
    total_rows = total_result["rows"][0][0] if total_result["rows"] else 0
    metrics.append(
        MetricConfig(
            id=_id(),
            title="Total Records",
            value=total_rows,
            formatted_value=_format_number(total_rows),
            trend="neutral",
        )
    )

    numeric_cols = [c for c in schema if c["type"].upper() in NUMERIC_TYPES]
    stat_map = {s["name"]: s for s in stats}

    # Up to 3 more metrics from numeric columns
    for col in numeric_cols[:3]:
        col_name = col["name"]
        s = stat_map.get(col_name, {})

        try:
            sum_result = duckdb_service.execute_query(
                f'SELECT SUM("{col_name}") FROM {table_name}'
            )
            total = sum_result["rows"][0][0] if sum_result["rows"] else 0
            if total is None:
                total = 0
        except Exception:
            total = 0

        metrics.append(
            MetricConfig(
                id=_id(),
                title=f"Total {col_name.replace('_', ' ').title()}",
                value=total,
                formatted_value=_format_number(total),
                trend="neutral",
            )
        )

    return metrics[:4]


def _format_number(value: Any) -> str:
    """Format a number with commas and optional abbreviation."""
    if value is None:
        return "0"
    try:
        num = float(value)
    except (ValueError, TypeError):
        return str(value)

    if abs(num) >= 1_000_000_000:
        return f"{num / 1_000_000_000:.1f}B"
    if abs(num) >= 1_000_000:
        return f"{num / 1_000_000:.1f}M"
    if abs(num) >= 10_000:
        return f"{num / 1_000:.1f}K"
    if num == int(num):
        return f"{int(num):,}"
    return f"{num:,.2f}"


def _id() -> str:
    return uuid.uuid4().hex[:8]
