from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.dependencies import get_duckdb
from app.models.source import DataSource, UploadResult
from app.services import ingest_service
from app.services.duckdb_service import DuckDBService

router = APIRouter(prefix="/sources", tags=["sources"])


@router.get("", response_model=list[DataSource])
async def list_sources() -> list[DataSource]:
    """Return all available data sources including coming-soon connectors."""
    return ingest_service.get_available_sources()


@router.post("/upload", response_model=UploadResult)
async def upload_csv(
    file: UploadFile = File(...),
    duckdb_service: DuckDBService = Depends(get_duckdb),
) -> UploadResult:
    """Upload a CSV file to ingest into the data warehouse."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    try:
        contents = await file.read()
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        result = ingest_service.ingest_csv_upload(
            filename=file.filename,
            file_bytes=contents,
            duckdb_service=duckdb_service,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to ingest CSV: {str(e)}")


@router.post("/{source_id}/connect", response_model=UploadResult)
async def connect_source(
    source_id: str,
    duckdb_service: DuckDBService = Depends(get_duckdb),
) -> UploadResult:
    """Connect to a data source (sample data or mock for coming-soon sources)."""
    # Check if it is a sample source
    if source_id.startswith("sample_"):
        try:
            return ingest_service.connect_sample(source_id, duckdb_service)
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to connect sample: {str(e)}")

    # Check if it is a known coming-soon source
    all_sources = ingest_service.get_available_sources()
    matching = [s for s in all_sources if s.id == source_id]
    if not matching:
        raise HTTPException(status_code=404, detail=f"Unknown source: {source_id}")

    if matching[0].status == "coming_soon":
        raise HTTPException(
            status_code=501,
            detail=f"{matching[0].name} connector is coming soon!",
        )

    raise HTTPException(status_code=400, detail=f"Cannot connect to source: {source_id}")
