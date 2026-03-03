import shutil
from pathlib import Path

from app.config import settings
from app.models.source import ColumnInfo, DataSource, UploadResult
from app.services.duckdb_service import DuckDBService


AVAILABLE_SOURCES: list[DataSource] = [
    DataSource(
        id="csv_upload",
        name="CSV Upload",
        type="file",
        icon="Upload",
        status="available",
        description="Upload a CSV file from your computer",
    ),
    DataSource(
        id="sample_sales",
        name="Sample Sales",
        type="sample",
        icon="ShoppingCart",
        status="available",
        description="Sample e-commerce sales dataset with orders, products, and revenue",
    ),
    DataSource(
        id="sample_customers",
        name="Sample Customers",
        type="sample",
        icon="Users",
        status="available",
        description="Sample customer dataset with demographics and purchase history",
    ),
    DataSource(
        id="postgresql",
        name="PostgreSQL",
        type="database",
        icon="Database",
        status="coming_soon",
        description="Connect to a PostgreSQL database",
    ),
    DataSource(
        id="mysql",
        name="MySQL",
        type="database",
        icon="Database",
        status="coming_soon",
        description="Connect to a MySQL database",
    ),
    DataSource(
        id="rest_api",
        name="REST API",
        type="api",
        icon="Globe",
        status="coming_soon",
        description="Pull data from any REST API endpoint",
    ),
    DataSource(
        id="snowflake",
        name="Snowflake",
        type="warehouse",
        icon="Snowflake",
        status="coming_soon",
        description="Connect to a Snowflake data warehouse",
    ),
    DataSource(
        id="bigquery",
        name="BigQuery",
        type="warehouse",
        icon="Cloud",
        status="coming_soon",
        description="Connect to Google BigQuery",
    ),
    DataSource(
        id="google_sheets",
        name="Google Sheets",
        type="api",
        icon="Sheet",
        status="coming_soon",
        description="Import data from Google Sheets",
    ),
    DataSource(
        id="salesforce",
        name="Salesforce",
        type="api",
        icon="Zap",
        status="coming_soon",
        description="Connect to Salesforce CRM",
    ),
    DataSource(
        id="hubspot",
        name="HubSpot",
        type="api",
        icon="Target",
        status="coming_soon",
        description="Connect to HubSpot CRM",
    ),
]

SAMPLE_TABLE_MAP: dict[str, str] = {
    "sample_sales": "sales_orders",
    "sample_customers": "customers",
}


def get_available_sources() -> list[DataSource]:
    """Return the list of all data sources, including coming-soon connectors."""
    return AVAILABLE_SOURCES


def ingest_csv_upload(
    filename: str,
    file_bytes: bytes,
    duckdb_service: DuckDBService,
) -> UploadResult:
    """Save an uploaded CSV file to disk and ingest it into DuckDB.

    Args:
        filename: Original filename from the upload.
        file_bytes: Raw bytes of the uploaded file.
        duckdb_service: The DuckDB service instance.

    Returns:
        UploadResult with table name, schema, and row count.
    """
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    safe_filename = Path(filename).stem
    dest_path = upload_dir / filename
    dest_path.write_bytes(file_bytes)

    result = duckdb_service.ingest_csv(str(dest_path), safe_filename)

    schema_info = [
        ColumnInfo(name=col["name"], type=col["type"], nullable=col.get("nullable", True))
        for col in result["schema"]
    ]

    return UploadResult(
        table_name=result["table_name"],
        schema_info=schema_info,
        row_count=result["row_count"],
        source_type="csv",
    )


def connect_sample(
    source_id: str,
    duckdb_service: DuckDBService,
) -> UploadResult:
    """Connect to a sample data source that is already loaded.

    Args:
        source_id: The identifier of the sample source (e.g. 'sample_sales').
        duckdb_service: The DuckDB service instance.

    Returns:
        UploadResult describing the already-loaded table.

    Raises:
        ValueError: If source_id is not a recognized sample source or table is
                    not loaded.
    """
    table_name = SAMPLE_TABLE_MAP.get(source_id)
    if table_name is None:
        raise ValueError(f"Unknown sample source: {source_id}")

    tables = duckdb_service.get_tables()
    matching = [t for t in tables if t["name"] == table_name]
    if not matching:
        raise ValueError(f"Sample table '{table_name}' is not loaded")

    schema = duckdb_service.get_schema(table_name)
    schema_info = [
        ColumnInfo(
            name=col["name"],
            type=col["type"],
            nullable=col.get("nullable", True),
            sample_values=col.get("sample_values"),
        )
        for col in schema
    ]

    return UploadResult(
        table_name=table_name,
        schema_info=schema_info,
        row_count=matching[0]["row_count"],
        source_type="sample",
    )
