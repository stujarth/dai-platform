import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.dependencies import init_services, shutdown_services
from app.routers import sources, data, transforms, reports, chat, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    init_services()
    yield
    shutdown_services()


app = FastAPI(
    title="DAI API",
    description="Data & AI Intelligence Platform API",
    version="0.1.0",
    lifespan=lifespan,
)

# Build CORS origins: always allow local dev, dynamically add Vercel domains
_cors_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]
_vercel_url = os.environ.get("VERCEL_URL")
if _vercel_url:
    _cors_origins.append(f"https://{_vercel_url}")
_vercel_prod_url = os.environ.get("VERCEL_PROJECT_PRODUCTION_URL")
if _vercel_prod_url:
    _cors_origins.append(f"https://{_vercel_prod_url}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1")
app.include_router(sources.router, prefix="/api/v1")
app.include_router(data.router, prefix="/api/v1")
app.include_router(transforms.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
