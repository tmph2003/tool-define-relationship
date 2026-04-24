from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import String, DateTime, text

from app.db.base import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    connection_key: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    data: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"), onupdate=datetime.utcnow)
    version: Mapped[int] = mapped_column(default=1, nullable=False, server_default="1")

    # Relationships
    relation_groups: Mapped[list["RelationGroup"]] = relationship(
        "RelationGroup",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    
    history: Mapped[list["ProjectHistory"]] = relationship(
        "ProjectHistory",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class ProjectHistory(Base):
    __tablename__ = "project_history"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    from sqlalchemy import ForeignKey
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    version: Mapped[int] = mapped_column(nullable=False)
    data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    column_groups: Mapped[list] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
