from __future__ import annotations

import anthropic
from app.config import settings
from app.services.duckdb_service import DuckDBService
from app.services.ai_service import AIService

_duckdb_service: DuckDBService | None = None
_ai_service: AIService | None = None


def init_services():
    global _duckdb_service, _ai_service
    _duckdb_service = DuckDBService(settings.DUCKDB_PATH)
    _duckdb_service.load_sample_data(settings.SAMPLE_DATA_DIR)

    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY) if settings.ANTHROPIC_API_KEY else None
    _ai_service = AIService(client, _duckdb_service, settings.CLAUDE_MODEL)


def shutdown_services():
    global _duckdb_service
    if _duckdb_service:
        _duckdb_service.close()


def get_duckdb() -> DuckDBService:
    assert _duckdb_service is not None
    return _duckdb_service


def get_ai_service() -> AIService:
    assert _ai_service is not None
    return _ai_service
