from __future__ import annotations

from pydantic import BaseModel
from typing import Any


class ChartRequest(BaseModel):
    table_name: str
    chart_type: str  # bar, line, pie, scatter, area
    x_column: str
    y_column: str
    aggregation: str = "sum"  # sum, avg, count, min, max
    title: str = ""
    series_column: str | None = None


class ChartConfig(BaseModel):
    id: str = ""
    title: str
    chart_type: str
    echarts_option: dict[str, Any]
    data_query: str = ""
    summary: str = ""


class MetricConfig(BaseModel):
    id: str = ""
    title: str
    value: Any
    formatted_value: str
    change_pct: float | None = None
    trend: str = "neutral"  # up, down, neutral


class DashboardConfig(BaseModel):
    charts: list[ChartConfig]
    metrics: list[MetricConfig]
