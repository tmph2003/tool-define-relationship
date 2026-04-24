"""
Trino metadata endpoints.

Provides REST APIs for connecting to Trino and browsing catalog metadata
(schemas, tables, columns).
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.schemas.trino import (
    ColumnsResponse,
    ErrorResponse,
    HealthResponse,
    SchemasResponse,
    TablesResponse,
    TrinoConnectionRequest,
    TrinoConnectionResponse,
)
from app.services import trino_service

router = APIRouter()


# ---------------------------------------------------------------------------
# GET /health — Trino-aware health check
# ---------------------------------------------------------------------------
@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Trino health check",
    description="Returns API status and whether Trino is reachable.",
)
async def trino_health() -> HealthResponse:
    reachable = trino_service.is_reachable()
    info = trino_service.get_connection_info()
    return HealthResponse(
        status="ok",
        trino_reachable=reachable,
        host=info["host"],
        catalog=info["catalog"],
        schema_name=info["schema_name"]
    )


# ---------------------------------------------------------------------------
# POST /connect — Establish Trino connection
# ---------------------------------------------------------------------------
@router.post(
    "/connect",
    response_model=TrinoConnectionResponse,
    responses={503: {"model": ErrorResponse}},
    summary="Connect to Trino",
    description=(
        "Establish a connection to a Trino cluster. "
        "Parameters override the defaults from environment variables."
    ),
)
async def connect_trino(body: TrinoConnectionRequest) -> TrinoConnectionResponse:
    return trino_service.connect(
        host=body.host,
        port=body.port,
        user=body.user,
        password=body.password.get_secret_value() if body.password else None,
        catalog=body.catalog,
        schema_name=body.schema_name,
        http_scheme=body.http_scheme,
    )


# ---------------------------------------------------------------------------
# POST /disconnect — Clear Trino connection
# ---------------------------------------------------------------------------
@router.post(
    "/disconnect",
    summary="Disconnect from Trino",
    description="Clears the current connection parameters.",
)
async def disconnect_trino() -> dict[str, str]:
    trino_service.disconnect()
    return {"status": "ok", "message": "Disconnected"}


# ---------------------------------------------------------------------------
# GET /schemas — List schemas
# ---------------------------------------------------------------------------
@router.get(
    "/schemas",
    response_model=SchemasResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    summary="List schemas",
    description="List all schemas in the currently connected Trino catalog.",
)
async def list_schemas() -> SchemasResponse:
    return trino_service.get_schemas()


# ---------------------------------------------------------------------------
# GET /tables — List tables in a schema
# ---------------------------------------------------------------------------
@router.get(
    "/tables",
    response_model=TablesResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    summary="List tables",
    description="List all tables in the specified schema.",
)
async def list_tables(
    schema_name: str = Query(
        ...,
        alias="schema",
        description="Schema name to list tables from",
        examples=["public", "default"],
    ),
) -> TablesResponse:
    return trino_service.get_tables(schema_name)


# ---------------------------------------------------------------------------
# GET /columns — List columns for a table
# ---------------------------------------------------------------------------
@router.get(
    "/columns",
    response_model=ColumnsResponse,
    responses={
        400: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
    summary="List columns",
    description="List all columns for a specific table in a schema.",
)
async def list_columns(
    schema_name: str = Query(
        ...,
        alias="schema",
        description="Schema name",
        examples=["public"],
    ),
    table_name: str = Query(
        ...,
        alias="table",
        description="Table name",
        examples=["users"],
    ),
) -> ColumnsResponse:
    return trino_service.get_columns(schema_name, table_name)
