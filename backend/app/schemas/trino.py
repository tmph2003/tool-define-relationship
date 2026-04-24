"""
Pydantic schemas for Trino metadata API.

Defines request/response models for connection, schemas, tables, and columns.
"""

from __future__ import annotations

from pydantic import BaseModel, Field, SecretStr


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------
class TrinoConnectionRequest(BaseModel):
    """Payload for POST /connect — override default Trino connection."""

    host: str = Field(..., examples=["trino.company.internal"])
    port: int = Field(8080, ge=1, le=65535)
    user: str = Field("trino", min_length=1)
    password: SecretStr | None = Field(None, description="Optional password for Trino auth")
    catalog: str = Field("hive", min_length=1)
    schema_name: str | None = Field(None, alias="schema", description="Default schema within the catalog")
    http_scheme: str = Field("http", pattern=r"^https?$")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------
class HealthResponse(BaseModel):
    status: str
    trino_reachable: bool
    host: str | None = None
    catalog: str | None = None
    schema_name: str | None = None
    user: str | None = None


class TrinoConnectionResponse(BaseModel):
    connected: bool
    host: str
    port: int
    catalog: str
    schema_name: str | None = None
    user: str
    message: str


class SchemaItem(BaseModel):
    schema_name: str


class SchemasResponse(BaseModel):
    catalog: str
    schemas: list[SchemaItem]
    count: int


class TableItem(BaseModel):
    table_name: str
    table_type: str | None = None


class TablesResponse(BaseModel):
    catalog: str
    schema_name: str
    tables: list[TableItem]
    count: int


class ColumnItem(BaseModel):
    column_name: str
    data_type: str
    is_nullable: str | None = None
    column_default: str | None = None
    comment: str | None = None
    ordinal_position: int | None = None


class ColumnsResponse(BaseModel):
    catalog: str
    schema_name: str
    table_name: str
    columns: list[ColumnItem]
    count: int


# ---------------------------------------------------------------------------
# Error response
# ---------------------------------------------------------------------------
class ErrorResponse(BaseModel):
    detail: str
    error_code: str | None = None
