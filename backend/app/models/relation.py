"""
Relation group / member models for normalized relationship storage.
"""

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, Integer, ForeignKey, UniqueConstraint, DateTime, text
from datetime import datetime

from app.db.base import Base


class RelationGroup(Base):
    __tablename__ = "relation_groups"

    group_id: Mapped[int] = mapped_column(primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )

    # Relationships
    members: Mapped[list["RelationMember"]] = relationship(
        back_populates="group",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class RelationMember(Base):
    __tablename__ = "relation_members"
    __table_args__ = (
        UniqueConstraint("group_id", "catalog", "schema", "table_name", "column_name", name="uq_group_table_column"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    group_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("relation_groups.group_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    catalog: Mapped[str | None] = mapped_column(String(255), nullable=True)
    schema: Mapped[str | None] = mapped_column(String(255), nullable=True)
    table_name: Mapped[str] = mapped_column(String(255), nullable=False)
    column_name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Relationships
    group: Mapped["RelationGroup"] = relationship(back_populates="members")
