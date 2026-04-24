from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete

from app.db.session import get_db
from app.models.project import Project, ProjectHistory
from app.models.relation import RelationGroup, RelationMember
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectHistoryResponse

router = APIRouter()


def _project_to_response(project: Project) -> dict:
    """Convert a Project ORM instance to a response dict with column_groups."""
    column_groups = []
    for group in project.relation_groups:
        members = [
            {
                "catalog": m.catalog,
                "schema": m.schema,
                "table": m.table_name,
                "column": m.column_name,
            }
            for m in group.members
        ]
        column_groups.append(members)

    return {
        "id": project.id,
        "connection_key": project.connection_key,
        "data": project.data,
        "column_groups": column_groups,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
        "version": project.version,
    }


@router.get("/{connection_key}", response_model=ProjectResponse)
async def get_project(connection_key: str, db: AsyncSession = Depends(get_db)):
    """Get project state by connection key."""
    result = await db.execute(select(Project).where(Project.connection_key == connection_key))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return _project_to_response(project)


@router.post("", response_model=ProjectResponse)
async def upsert_project(project_in: ProjectCreate, db: AsyncSession = Depends(get_db)):
    """Create or update a project state (nodes + column_groups)."""
    result = await db.execute(select(Project).where(Project.connection_key == project_in.connection_key))
    project = result.scalars().first()

    if project:
        # Optimistic Concurrency Control check
        if project_in.version is not None and project_in.version != project.version:
            raise HTTPException(
                status_code=409, 
                detail="Project was modified by another user. Please refresh to get the latest changes."
            )
            
        # Update existing project's node data and increment version
        project.data = project_in.data
        project.version += 1

        # Delete old relation groups (cascade deletes members)
        for group in list(project.relation_groups):
            await db.delete(group)
        await db.flush()
    else:
        # Create new project
        project = Project(
            connection_key=project_in.connection_key,
            data=project_in.data,
            version=1,
        )
        db.add(project)
        await db.flush()  # get project.id

    # Create new relation groups + members
    for group_members in project_in.column_groups:
        new_members = []
        for member in group_members:
            new_members.append(RelationMember(
                catalog=member.catalog,
                schema=member.schema_,
                table_name=member.table,
                column_name=member.column,
            ))
            
        group = RelationGroup(project_id=project.id, members=new_members)
        db.add(group)

    # Save to history snapshot
    history_snapshot = ProjectHistory(
        project_id=project.id,
        version=project.version,
        data=project_in.data,
        column_groups=[[m.model_dump() for m in g] for g in project_in.column_groups],
    )
    db.add(history_snapshot)
    await db.flush()

    # Ensure maximum 30 snapshots per project
    old_snapshots = await db.execute(
        select(ProjectHistory.id)
        .where(ProjectHistory.project_id == project.id)
        .order_by(ProjectHistory.version.desc())
        .offset(30)
    )
    old_snapshot_ids = old_snapshots.scalars().all()
    
    if old_snapshot_ids:
        await db.execute(
            delete(ProjectHistory).where(ProjectHistory.id.in_(old_snapshot_ids))
        )

    await db.commit()
    await db.refresh(project)
    return _project_to_response(project)


@router.get("/{connection_key}/history", response_model=list[ProjectHistoryResponse])
async def get_project_history(connection_key: str, db: AsyncSession = Depends(get_db)):
    """Get project history list."""
    result = await db.execute(select(Project).where(Project.connection_key == connection_key))
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    history_result = await db.execute(
        select(ProjectHistory)
        .where(ProjectHistory.project_id == project.id)
        .order_by(ProjectHistory.version.desc())
    )
    return history_result.scalars().all()


@router.delete("/history/{history_id}")
async def delete_project_history(history_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a specific history snapshot."""
    result = await db.execute(select(ProjectHistory).where(ProjectHistory.id == history_id))
    history = result.scalars().first()
    if not history:
        raise HTTPException(status_code=404, detail="History not found")
        
    await db.delete(history)
    await db.commit()
    return {"message": "History deleted successfully"}
