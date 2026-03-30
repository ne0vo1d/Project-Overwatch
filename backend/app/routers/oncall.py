from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.oncall import OnCallSchedule, OnCallEntry
from app.models.user import User
from app.schemas.oncall import (
    OnCallScheduleCreate, OnCallScheduleRead, OnCallScheduleUpdate,
    OnCallEntryCreate, OnCallEntryRead, CurrentOnCall,
)
from app.core.deps import get_current_user

router = APIRouter(prefix="/oncall", tags=["on-call"])


@router.get("/current", response_model=list[CurrentOnCall])
async def get_current_oncall(
    service_id: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return who is currently on call, optionally filtered by service."""
    now = datetime.now(timezone.utc)
    query = select(OnCallSchedule).options(
        selectinload(OnCallSchedule.entries).selectinload(OnCallEntry.user)
    ).where(OnCallSchedule.is_active == True)
    if service_id:
        query = query.where(OnCallSchedule.service_id == service_id)

    result = await db.execute(query)
    schedules = result.scalars().all()

    output = []
    for sched in schedules:
        active = [e for e in sched.entries if e.start_at <= now <= e.end_at]
        primary = next((e for e in active if e.role == "primary"), None)
        secondary = next((e for e in active if e.role == "secondary"), None)
        output.append(CurrentOnCall(
            schedule_id=sched.id,
            schedule_name=sched.name,
            primary=_entry_read(primary) if primary else None,
            secondary=_entry_read(secondary) if secondary else None,
        ))
    return output


@router.get("/schedules", response_model=list[OnCallScheduleRead])
async def list_schedules(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(OnCallSchedule)
        .options(selectinload(OnCallSchedule.entries).selectinload(OnCallEntry.user))
        .order_by(OnCallSchedule.created_at)
    )
    return result.scalars().all()


@router.post("/schedules", response_model=OnCallScheduleRead, status_code=201)
async def create_schedule(
    data: OnCallScheduleCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    schedule = OnCallSchedule(**data.model_dump())
    db.add(schedule)
    await db.commit()
    return await _get_schedule_or_404(db, schedule.id)


@router.get("/schedules/{schedule_id}", response_model=OnCallScheduleRead)
async def get_schedule(
    schedule_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await _get_schedule_or_404(db, schedule_id)


@router.patch("/schedules/{schedule_id}", response_model=OnCallScheduleRead)
async def update_schedule(
    schedule_id: str,
    data: OnCallScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(OnCallSchedule).where(OnCallSchedule.id == schedule_id))
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(schedule, field, value)
    await db.commit()
    return await _get_schedule_or_404(db, schedule_id)


@router.delete("/schedules/{schedule_id}", status_code=204)
async def delete_schedule(
    schedule_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(OnCallSchedule).where(OnCallSchedule.id == schedule_id))
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    await db.delete(schedule)
    await db.commit()


@router.post("/schedules/{schedule_id}/entries", response_model=OnCallEntryRead, status_code=201)
async def add_entry(
    schedule_id: str,
    data: OnCallEntryCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    await _get_schedule_or_404(db, schedule_id)

    result = await db.execute(select(User).where(User.id == data.user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.end_at <= data.start_at:
        raise HTTPException(status_code=422, detail="end_at must be after start_at")

    entry = OnCallEntry(schedule_id=schedule_id, **data.model_dump())
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return _entry_read(entry, user)


@router.delete("/schedules/{schedule_id}/entries/{entry_id}", status_code=204)
async def delete_entry(
    schedule_id: str,
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(OnCallEntry).where(OnCallEntry.id == entry_id, OnCallEntry.schedule_id == schedule_id)
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    await db.delete(entry)
    await db.commit()


def _entry_read(entry: OnCallEntry, user: User | None = None) -> OnCallEntryRead:
    u = user or getattr(entry, "user", None)
    return OnCallEntryRead(
        id=entry.id,
        schedule_id=entry.schedule_id,
        user_id=entry.user_id,
        user_name=u.name if u else None,
        user_email=u.email if u else None,
        start_at=entry.start_at,
        end_at=entry.end_at,
        role=entry.role,
    )


async def _get_schedule_or_404(db: AsyncSession, schedule_id: str) -> OnCallSchedule:
    result = await db.execute(
        select(OnCallSchedule)
        .options(selectinload(OnCallSchedule.entries).selectinload(OnCallEntry.user))
        .where(OnCallSchedule.id == schedule_id)
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule
