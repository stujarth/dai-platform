from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import get_duckdb
from app.models.report import ChartConfig, ChartRequest, DashboardConfig
from app.services import report_service
from app.services.duckdb_service import DuckDBService

router = APIRouter(prefix="/reports", tags=["reports"])


class DashboardRequest(BaseModel):
    table_name: str


@router.get("/{table_name}/suggest", response_model=list[ChartConfig])
async def suggest_charts(
    table_name: str,
    duckdb_service: DuckDBService = Depends(get_duckdb),
) -> list[ChartConfig]:
    """Get suggested chart configurations based on the table schema."""
    try:
        return report_service.suggest_charts(table_name, duckdb_service)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestions: {str(e)}")


@router.post("/chart", response_model=ChartConfig)
async def generate_chart(
    request: ChartRequest,
    duckdb_service: DuckDBService = Depends(get_duckdb),
) -> ChartConfig:
    """Generate a single chart from the given configuration."""
    try:
        return report_service.generate_chart(
            table_name=request.table_name,
            chart_type=request.chart_type,
            x_col=request.x_column,
            y_col=request.y_column,
            agg=request.aggregation,
            duckdb_service=duckdb_service,
            title=request.title,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chart generation failed: {str(e)}")


@router.post("/dashboard", response_model=DashboardConfig)
async def generate_dashboard(
    request: DashboardRequest,
    duckdb_service: DuckDBService = Depends(get_duckdb),
) -> DashboardConfig:
    """Auto-generate a full dashboard with metric cards and charts."""
    try:
        return report_service.generate_dashboard(request.table_name, duckdb_service)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dashboard generation failed: {str(e)}")
