from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_duckdb
from app.models.transform import (
    SQLTransformRequest,
    TransformRequest,
    TransformResult,
    TransformSuggestion,
)
from app.services import transform_service
from app.services.duckdb_service import DuckDBService

router = APIRouter(prefix="/transforms", tags=["transforms"])


@router.get("/{table_name}/suggestions", response_model=list[TransformSuggestion])
async def get_suggestions(
    table_name: str,
    duckdb_service: DuckDBService = Depends(get_duckdb),
) -> list[TransformSuggestion]:
    """Get AI-powered transform suggestions for a table."""
    try:
        return transform_service.get_suggestions(table_name, duckdb_service)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestions: {str(e)}")


@router.post("/apply", response_model=TransformResult)
async def apply_transform(
    request: TransformRequest,
    duckdb_service: DuckDBService = Depends(get_duckdb),
) -> TransformResult:
    """Apply a transform to a table.

    Supported transform_types:
      - filter: params must include column, operator, value
      - aggregate: params must include group_by (list), aggregation_column, aggregation_function
      - sql: params must include sql
    """
    try:
        if request.transform_type == "filter":
            params = request.params
            column = params.get("column")
            operator = params.get("operator")
            value = params.get("value")
            if not column or not operator:
                raise HTTPException(
                    status_code=400,
                    detail="Filter transform requires 'column' and 'operator' in params",
                )
            return transform_service.apply_filter(
                source_table=request.source_table,
                column=column,
                operator=operator,
                value=value,
                target_table=request.target_table,
                duckdb_service=duckdb_service,
            )

        elif request.transform_type == "aggregate":
            params = request.params
            group_by = params.get("group_by")
            agg_col = params.get("aggregation_column")
            agg_func = params.get("aggregation_function", "SUM")
            if not group_by or not agg_col:
                raise HTTPException(
                    status_code=400,
                    detail="Aggregate transform requires 'group_by' and 'aggregation_column' in params",
                )
            return transform_service.apply_aggregation(
                source_table=request.source_table,
                group_by_cols=group_by if isinstance(group_by, list) else [group_by],
                agg_col=agg_col,
                agg_func=agg_func,
                target_table=request.target_table,
                duckdb_service=duckdb_service,
            )

        elif request.transform_type == "sql":
            sql = request.params.get("sql", "")
            if not sql:
                raise HTTPException(
                    status_code=400,
                    detail="SQL transform requires 'sql' in params",
                )
            target = request.target_table or f"{request.source_table}_transformed"
            return transform_service.apply_sql_transform(
                sql=sql,
                target_table=target,
                duckdb_service=duckdb_service,
            )

        elif request.transform_type == "calculate":
            expression = request.params.get("expression", "")
            new_column = request.params.get("new_column", "calculated")
            if not expression:
                raise HTTPException(
                    status_code=400,
                    detail="Calculate transform requires 'expression' in params",
                )
            sql = f"SELECT *, {expression} AS {new_column} FROM {request.source_table}"
            target = request.target_table or f"{request.source_table}_calculated"
            return transform_service.apply_sql_transform(
                sql=sql,
                target_table=target,
                duckdb_service=duckdb_service,
            )

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown transform type: {request.transform_type}. "
                       f"Supported: filter, aggregate, sql, calculate",
            )

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transform failed: {str(e)}")


@router.post("/sql", response_model=TransformResult)
async def apply_sql_transform(
    request: SQLTransformRequest,
    duckdb_service: DuckDBService = Depends(get_duckdb),
) -> TransformResult:
    """Apply a raw SQL SELECT query as a transform, storing results in a new table."""
    try:
        return transform_service.apply_sql_transform(
            sql=request.sql,
            target_table=request.target_table,
            duckdb_service=duckdb_service,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SQL transform failed: {str(e)}")
