from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.task import Task
from app.models.incident import Incident
from app.models.user import User
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.core.deps import get_current_user

router = APIRouter(prefix="/incidents/{incident_id}/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskRead])
async def list_tasks(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    await _get_incident_or_404(db, incident_id)
    result = await db.execute(
        select(Task).where(Task.incident_id == incident_id).order_by(Task.created_at)
    )
    tasks = result.scalars().all()
    return [await _enrich_task(db, t) for t in tasks]


@router.post("", response_model=TaskRead, status_code=201)
async def create_task(
    incident_id: str,
    data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    await _get_incident_or_404(db, incident_id)
    task = Task(incident_id=incident_id, **data.model_dump())
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return await _enrich_task(db, task)


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(
    incident_id: str,
    task_id: str,
    data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    task = await _get_task_or_404(db, incident_id, task_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(task, field, value)
    await db.commit()
    await db.refresh(task)
    return await _enrich_task(db, task)


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    incident_id: str,
    task_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    task = await _get_task_or_404(db, incident_id, task_id)
    await db.delete(task)
    await db.commit()


async def _get_incident_or_404(db: AsyncSession, incident_id: str) -> Incident:
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


async def _get_task_or_404(db: AsyncSession, incident_id: str, task_id: str) -> Task:
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.incident_id == incident_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


async def _enrich_task(db: AsyncSession, task: Task) -> TaskRead:
    assignee_name = None
    if task.assignee_id:
        result = await db.execute(select(User.name).where(User.id == task.assignee_id))
        assignee_name = result.scalar_one_or_none()
    return TaskRead(
        id=task.id,
        title=task.title,
        description=task.description,
        status=task.status,
        incident_id=task.incident_id,
        assignee_id=task.assignee_id,
        assignee_name=assignee_name,
        created_at=task.created_at,
        due_at=task.due_at,
    )
