import os
from pydantic_settings import BaseSettings
from pathlib import Path


def _default_sample_dir() -> str:
    """Compute default path to data/samples/ from this file's location."""
    return str(Path(__file__).resolve().parent.parent.parent.parent / "data" / "samples")


def _default_upload_dir() -> str:
    """Use /tmp on Vercel (read-only filesystem), local uploads/ dir otherwise."""
    if os.environ.get("VERCEL"):
        return "/tmp/dai-uploads"
    return str(Path(__file__).resolve().parent.parent / "uploads")


class Settings(BaseSettings):
    ANTHROPIC_API_KEY: str = ""
    DUCKDB_PATH: str = ":memory:"
    SAMPLE_DATA_DIR: str = _default_sample_dir()
    UPLOAD_DIR: str = _default_upload_dir()
    CLAUDE_MODEL: str = "claude-sonnet-4-20250514"
    MAX_PREVIEW_ROWS: int = 100

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
