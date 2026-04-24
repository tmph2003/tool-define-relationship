"""
API v1 — top-level router.

Include all endpoint routers here.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import trino, projects

api_router = APIRouter()

# Trino metadata endpoints
api_router.include_router(trino.router, prefix="/trino", tags=["trino"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
