from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str = ""
    DUCKDB_PATH: str = ":memory:"
    SAMPLE_DATA_DIR: str = str(Path(__file__).parent.parent.parent.parent / "data" / "samples")
    UPLOAD_DIR: str = str(Path(__file__).parent.parent / "uploads")
    CLAUDE_MODEL: str = "claude-sonnet-4-20250514"
    MAX_PREVIEW_ROWS: int = 100

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
