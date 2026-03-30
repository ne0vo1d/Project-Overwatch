from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.maintenance import MaintenanceWindow
from app.models.user import User
from app.schemas.maintenance import MaintenanceWindowCreate, MaintenanceWindowRead, MaintenanceWindowUpdate
from app.core.deps import get_current_user

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


@router.get("", response_model=list[MaintenanceWindowRead])
async def list_windows(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(MaintenanceWindow).order_by(MaintenanceWindow.start_at.desc())
    )
    windows = result.scalars().all()
    return [_enrich(w) for w in windows]


@router.post("", response_model=MaintenanceWindowRead, status_code=201)
async def create_window(
    data: MaintenanceWindowCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.end_at <= data.start_at:
        raise HTTPException(status_code=422, detail="end_at must be after start_at")
    window = MaintenanceWindow(**data.model_dump(), created_by=current_user.id)
    db.add(window)
    await db.commit()
    await db.refresh(window)
    return _enrich(window)


@router.patch("/{window_id}", response_model=MaintenanceWindowRead)
async def update_window(
    window_id: str,
    data: MaintenanceWindowUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    window = await _get_or_404(db, window_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(window, field, value)
    await db.commit()
    await db.refresh(window)
    return _enrich(window)


@router.delete("/{window_id}", status_code=204)
async def delete_window(
    window_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    window = await _get_or_404(db, window_id)
    await db.delete(window)
    await db.commit()


def _enrich(w: MaintenanceWindow) -> MaintenanceWindowRead:
    now = datetime.now(timezone.utc)
    return MaintenanceWindowRead(
        id=w.id,
        name=w.name,
        description=w.description,
        start_at=w.start_at,
        end_at=w.end_at,
        service_ids=w.service_ids or [],
        topics=w.topics or [],
        is_active=w.is_active,
        created_by=w.created_by,
        created_at=w.created_at,
        is_currently_active=w.is_active and w.start_at <= now <= w.end_at,
    )


async def _get_or_404(db: AsyncSession, window_id: str) -> MaintenanceWindow:
    result = await db.execute(select(MaintenanceWindow).where(MaintenanceWindow.id == window_id))
    window = result.scalar_one_or_none()
    if not window:
        raise HTTPException(status_code=404, detail="Maintenance window not found")
    return window
