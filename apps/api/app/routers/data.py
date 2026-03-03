from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import get_duckdb
from app.models.data import ColumnStats, DataPreview, QueryRequest, QueryResult, TableInfo
from app.models.source import ColumnInfo
from app.services.duckdb_service import DuckDBService

router = APIRouter(prefix="/data", tags=["data"])


@router.get("/tables", response_model=list[TableInfo])
async def list_tables(
    duckdb_service: DuckDBService = Depends(get_duckdb),
) -> list[TableInfo]:
    """List all loaded tables in the data warehouse."""
    try:
        tables = duckdb_service.get_tables()
        return [
            TableInfo(
                name=t["name"],
                row_count=t["row_count"],
                column_count=t["column_count"],
                source_type=t.get("source_type", "unknown"),
                created_at=t.get("created_at"),
            )
            for t in tables
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list tables: {str(e)}")


@router.get("/tables/{table_name}/schema", response_model=list[ColumnInfo])
async def get_table_schema(
    table_name: str,
    duckdb_service: DuckDBService = Depends(get_duckdb),
) -> list[ColumnInfo]:
    """Get the column definitions for a table."""
    try:
        schema = duckdb_service.get_schema(table_name)
        return [
            ColumnInfo(
                name=col["name"],
                type=col["type"],
                nullable=col.get("nullable", True),
                sample_values=col.get("sample_values"),
            )
            for col in schema
        ]
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Table not found or error: {str(e)}")


@router.get("/tables/{table_name}/preview", response_model=DataPreview)
async def preview_table(
    table_name: str,
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    duckdb_service: DuckDBService = Depends(get_duckdb),
) -> DataPreview:
    """Get a paginated preview of the first N rows of a table."""
    try:
        result = duckdb_service.preview(table_name, limit=limit, offset=offset)
        return DataPreview(
            columns=result["columns"],
            column_types=result["column_types"],
            rows=result["rows"],
            total_count=result["total_count"],
            page=result["page"],
            page_size=result["page_size"],
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Preview failed: {str(e)}")


@router.post("/query", response_model=QueryResult)
async def execute_query(
    request: QueryRequest,
    duckdb_service: DuckDBService = Depends(get_duckdb),
) -> QueryResult:
    """Execute a SQL query against the data warehouse.

    Only SELECT and WITH queries are allowed.
    """
    try:
        result = duckdb_service.execute_query(request.sql, limit=request.limit)
        return QueryResult(
            columns=result["columns"],
            rows=result["rows"],
            row_count=result["row_count"],
            execution_time_ms=result["execution_time_ms"],
            sql=result["sql"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@router.get("/tables/{table_name}/stats", response_model=list[ColumnStats])
async def get_table_stats(
    table_name: str,
    duckdb_service: DuckDBService = Depends(get_duckdb),
) -> list[ColumnStats]:
    """Get column-level statistics for a table."""
    try:
        stats = duckdb_service.get_column_stats(table_name)
        return [
            ColumnStats(
                name=s["name"],
                type=s["type"],
                distinct_count=s.get("distinct_count", 0),
                null_count=s.get("null_count", 0),
                min_value=s.get("min_value"),
                max_value=s.get("max_value"),
                avg_value=s.get("avg_value"),
            )
            for s in stats
        ]
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Stats failed: {str(e)}")
