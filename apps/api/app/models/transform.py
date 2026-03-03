from __future__ import annotations

from pydantic import BaseModel
from typing import Any


class TransformRequest(BaseModel):
    source_table: str
    transform_type: str  # filter, rename, calculate, aggregate, sql
    params: dict[str, Any] = {}
    target_table: str | None = None


class SQLTransformRequest(BaseModel):
    sql: str
    target_table: str


class TransformSuggestion(BaseModel):
    name: str
    description: str
    transform_type: str
    params: dict[str, Any] = {}
    sql_preview: str = ""


class TransformResult(BaseModel):
    table_name: str
    row_count: int
    column_count: int
    columns: list[str]
