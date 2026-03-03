from __future__ import annotations

from pydantic import BaseModel
from typing import Any


class DataPreview(BaseModel):
    columns: list[str]
    column_types: list[str]
    rows: list[list[Any]]
    total_count: int
    page: int = 1
    page_size: int = 100


class QueryRequest(BaseModel):
    sql: str
    limit: int = 1000


class QueryResult(BaseModel):
    columns: list[str]
    rows: list[list[Any]]
    row_count: int
    execution_time_ms: float
    sql: str = ""


class TableInfo(BaseModel):
    name: str
    row_count: int
    column_count: int
    source_type: str = "sample"
    created_at: str | None = None


class ColumnStats(BaseModel):
    name: str
    type: str
    distinct_count: int
    null_count: int
    min_value: Any | None = None
    max_value: Any | None = None
    avg_value: float | None = None
