from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.models.project import Project
from app.models.relation import RelationGroup, RelationMember
from app.schemas.project import ProjectCreate, ProjectResponse

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
        # Update existing project's node data
        project.data = project_in.data

        # Delete old relation groups (cascade deletes members)
        for group in list(project.relation_groups):
            await db.delete(group)
        await db.flush()
    else:
        # Create new project
        project = Project(
            connection_key=project_in.connection_key,
            data=project_in.data,
        )
        db.add(project)
        await db.flush()  # get project.id

    # Create new relation groups + members
    for group_members in project_in.column_groups:
        group = RelationGroup(project_id=project.id)
        db.add(group)
        await db.flush()  # get group.group_id

        for member in group_members:
            db.add(RelationMember(
                group_id=group.group_id,
                catalog=member.catalog,
                schema=member.schema_,
                table_name=member.table,
                column_name=member.column,
            ))

    await db.commit()
    await db.refresh(project)
    return _project_to_response(project)
