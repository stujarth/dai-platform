"""
Vercel Serverless Function entry point.

Vercel detects the module-level `app` variable as a FastAPI ASGI application
and serves it via its built-in Python runtime adapter.
"""
import sys
from pathlib import Path

# Make apps/api/ importable so that `from app.main import app` works
_api_dir = str(Path(__file__).resolve().parent.parent / "apps" / "api")
if _api_dir not in sys.path:
    sys.path.insert(0, _api_dir)

from app.main import app  # noqa: E402
