from __future__ import annotations

from pydantic import BaseModel
from typing import Any, Literal


class DataSource(BaseModel):
    id: str
    name: str
    type: Literal["file", "sample", "database", "api", "warehouse"]
    icon: str
    status: Literal["available", "connected", "coming_soon"]
    description: str = ""


class ConnectionConfig(BaseModel):
    source_id: str
    params: dict[str, Any] = {}


class ColumnInfo(BaseModel):
    name: str
    type: str
    nullable: bool = True
    sample_values: list[Any] | None = None


class UploadResult(BaseModel):
    table_name: str
    schema_info: list[ColumnInfo]
    row_count: int
    source_type: str = "csv"
