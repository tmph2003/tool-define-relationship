"""
Trino metadata service — encapsulates all Trino connectivity and queries.

This is a stateful service: call `connect()` to establish connection params,
then use the query methods.  Connection params are held in-memory (per-process).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import trino
from trino.exceptions import TrinoExternalError, TrinoUserError

from app.core.config import settings
from app.core.exceptions import (
    TrinoConnectionError,
    TrinoNotConnectedError,
    TrinoQueryError,
)
from app.schemas.trino import (
    ColumnItem,
    ColumnsResponse,
    SchemaItem,
    SchemasResponse,
    TableItem,
    TablesResponse,
    TrinoConnectionResponse,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Connection parameters dataclass
# ---------------------------------------------------------------------------
@dataclass
class _TrinoParams:
    host: str = ""
    port: int = 8080
    user: str = "trino"
    password: str | None = None
    catalog: str = "hive"
    schema_name: str | None = None
    http_scheme: str = "http"
    verify: bool = True
    connected: bool = False


# Module-level singleton — shared across requests in the same worker.
_params = _TrinoParams()


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------
def _get_connection() -> trino.dbapi.Connection:
    """Create a fresh Trino DBAPI connection using current params."""
    if not _params.connected:
        raise TrinoNotConnectedError()
    try:
        auth = (
            trino.auth.BasicAuthentication(_params.user, _params.password)
            if _params.password
            else None
        )
        return trino.dbapi.connect(
            host=_params.host,
            port=_params.port,
            user=_params.user,
            auth=auth,
            catalog=_params.catalog,
            http_scheme=_params.http_scheme,
            verify=_params.verify,
            request_timeout=10.0, # Fail fast if unreachable
        )
    except Exception as exc:
        logger.exception("Trino connection failed")
        raise TrinoConnectionError(detail=f"Trino connection failed: {exc}") from exc


def _execute_query(sql: str, params: tuple[Any, ...] | None = None) -> list[list[Any]]:
    """Execute a SQL query against Trino and return all rows."""
    conn = _get_connection()
    try:
        cur = conn.cursor()
        cur.execute(sql, params)
        rows = cur.fetchall()
        return rows
    except (TrinoExternalError, TrinoUserError) as exc:
        logger.exception("Trino query error: %s", sql)
        raise TrinoQueryError(detail=f"Trino query error: {exc}") from exc
    except Exception as exc:
        logger.exception("Unexpected error executing Trino query")
        raise TrinoQueryError(detail=f"Unexpected query error: {exc}") from exc
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def connect(
    host: str,
    port: int,
    user: str,
    catalog: str,
    password: str | None = None,
    schema_name: str | None = None,
    http_scheme: str = "http",
    verify: bool = True,
) -> TrinoConnectionResponse:
    """Store connection params and verify connectivity with a lightweight query."""
    _params.host = host
    _params.port = port
    _params.user = user
    _params.password = password
    _params.catalog = catalog
    _params.schema_name = schema_name
    _params.http_scheme = http_scheme
    _params.verify = verify
    _params.connected = True  # optimistically set so _get_connection works

    # Verify with a no-op query
    try:
        conn = _get_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.fetchone()
        conn.close()
    except Exception as exc:
        _params.connected = False
        raise TrinoConnectionError(detail=f"Failed to verify connection: {exc}") from exc

    logger.info("Connected to Trino at %s:%s catalog=%s", host, port, catalog)
    return TrinoConnectionResponse(
        connected=True,
        host=host,
        port=port,
        catalog=catalog,
        schema_name=schema_name,
        user=user,
        message=f"Successfully connected to {host}:{port}/{catalog}",
    )


def disconnect() -> None:
    """Disconnect and clear connection params."""
    _params.host = ""
    _params.port = 8080
    _params.user = "trino"
    _params.password = None
    _params.catalog = "hive"
    _params.schema_name = None
    _params.http_scheme = "http"
    _params.verify = True
    _params.connected = False
    logger.info("Disconnected from Trino")

def connect_with_defaults() -> TrinoConnectionResponse:
    """Connect using values from environment / settings."""
    return connect(
        host=settings.TRINO_HOST,
        port=settings.TRINO_PORT,
        user=settings.TRINO_USER,
        catalog=settings.TRINO_CATALOG,
        http_scheme=settings.TRINO_HTTP_SCHEME,
    )


def is_reachable() -> bool:
    """Return True if Trino is reachable with current params."""
    if not _params.connected:
        return False
    try:
        conn = _get_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.fetchone()
        conn.close()
        return True
    except Exception:
        return False


def get_connection_info() -> dict[str, str | None]:
    """Return current connection host, catalog, schema, and user."""
    if not _params.connected:
        return {"host": None, "catalog": None, "schema_name": None, "user": None}
    return {"host": _params.host, "catalog": _params.catalog, "schema_name": _params.schema_name, "user": _params.user}


def get_catalogs() -> list[str]:
    """List all available catalogs."""
    rows = _execute_query("SHOW CATALOGS")
    return [row[0] for row in rows]


def get_schemas(catalog: str | None = None) -> SchemasResponse:
    """List all schemas in a catalog."""
    target_catalog = catalog or _params.catalog
    rows = _execute_query(f'SHOW SCHEMAS FROM "{target_catalog}"')
    schemas = [SchemaItem(schema_name=row[0]) for row in rows]
    return SchemasResponse(
        catalog=target_catalog,
        schemas=schemas,
        count=len(schemas),
    )


def get_tables(schema_name: str, catalog: str | None = None) -> TablesResponse:
    """List all tables in a given schema."""
    target_catalog = catalog or _params.catalog
    tables = []
    try:
        rows = _execute_query(f'SHOW TABLES FROM "{target_catalog}"."{schema_name}"')
        tables = [TableItem(table_name=row[0]) for row in rows]
        
        # Try to enrich with table types via information_schema
        try:
            type_rows = _execute_query(
                "SELECT table_name, table_type "
                f'FROM "{target_catalog}".information_schema.tables '
                f"WHERE table_schema = '{schema_name}'"
            )
            type_map = {r[0]: r[1] for r in type_rows}
            for t in tables:
                t.table_type = type_map.get(t.table_name)
        except Exception:
            logger.debug("Could not fetch table types from information_schema")

    except TrinoQueryError as exc:
        # Fallback: Sometimes SHOW TABLES is blocked by Ranger/Access Control
        # but information_schema.tables is permitted and correctly filtered.
        logger.warning(f"SHOW TABLES failed for {schema_name}, falling back to information_schema: {exc}")
        try:
            fallback_rows = _execute_query(
                "SELECT table_name, table_type "
                f'FROM "{target_catalog}".information_schema.tables '
                f"WHERE table_schema = '{schema_name}'"
            )
            tables = [TableItem(table_name=row[0], table_type=row[1]) for row in fallback_rows]
        except Exception as fallback_exc:
            logger.exception("Fallback to information_schema also failed")
            raise exc # raise the original permission error if fallback also fails

    return TablesResponse(
        catalog=target_catalog,
        schema_name=schema_name,
        tables=tables,
        count=len(tables),
    )


def get_columns(schema_name: str, table_name: str, catalog: str | None = None) -> ColumnsResponse:
    """List all columns for a specific table."""
    target_catalog = catalog or _params.catalog
    rows = _execute_query(
        "SELECT column_name, data_type, is_nullable, column_default, comment, ordinal_position "
        f'FROM "{target_catalog}".information_schema.columns '
        f"WHERE table_schema = '{schema_name}' AND table_name = '{table_name}' "
        "ORDER BY ordinal_position"
    )

    columns = [
        ColumnItem(
            column_name=row[0],
            data_type=row[1],
            is_nullable=row[2] if len(row) > 2 else None,
            column_default=row[3] if len(row) > 3 else None,
            comment=row[4] if len(row) > 4 else None,
            ordinal_position=row[5] if len(row) > 5 else None,
        )
        for row in rows
    ]

    return ColumnsResponse(
        catalog=target_catalog,
        schema_name=schema_name,
        table_name=table_name,
        columns=columns,
        count=len(columns),
    )
