from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Dict, Any, Optional


# ── Relation group schemas ─────────────────────────────────────────────────────

class RelationMemberSchema(BaseModel):
    """A single table.column endpoint in a relation group."""
    catalog: Optional[str] = None
    schema_: Optional[str] = Field(None, alias="schema")
    table: str
    column: str


class RelationGroupSchema(BaseModel):
    """A group of related columns (the portable column_groups format)."""
    members: list[RelationMemberSchema]
    note: Optional[str] = None


# ── Project schemas ────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    connection_key: str
    data: Dict[str, Any]  # { nodes: [...] }
    column_groups: list[list[RelationMemberSchema]] = []


class ProjectUpdate(BaseModel):
    connection_key: str
    data: Dict[str, Any]
    column_groups: list[list[RelationMemberSchema]] = []


class ProjectResponse(BaseModel):
    id: int
    connection_key: str
    data: Dict[str, Any]
    column_groups: list[list[RelationMemberSchema]] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
