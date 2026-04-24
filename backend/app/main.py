"""
Relationship Designer — Application entrypoint.

Run with: uvicorn app.main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1.router import api_router

from contextlib import asynccontextmanager
from app.db.session import engine
from app.db.base import Base
# ensure models are loaded
import app.models

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        # Safely add the version column for OCC if it doesn't exist
        from sqlalchemy import text
        from sqlalchemy.exc import ProgrammingError
        try:
            await conn.execute(text("ALTER TABLE projects ADD COLUMN version INTEGER NOT NULL DEFAULT 1"))
        except ProgrammingError:
            # Column already exists
            pass
    yield
    # Cleanup on shutdown

app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(api_router, prefix="/api/v1")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["health"])
async def health_check():
    """Liveness probe."""
    return {"status": "ok"}
