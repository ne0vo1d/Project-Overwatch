from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.channel import NotificationChannel
from app.models.user import User
from app.schemas.channel import ChannelCreate, ChannelRead, ChannelUpdate
from app.core.deps import get_current_user, get_admin_user

router = APIRouter(prefix="/channels", tags=["channels"])


@router.get("", response_model=list[ChannelRead])
async def list_channels(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(NotificationChannel).order_by(NotificationChannel.created_at))
    return result.scalars().all()


@router.post("", response_model=ChannelRead, status_code=201)
async def create_channel(
    data: ChannelCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    channel = NotificationChannel(**data.model_dump())
    db.add(channel)
    await db.commit()
    await db.refresh(channel)
    return channel


@router.get("/{channel_id}", response_model=ChannelRead)
async def get_channel(
    channel_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await _get_or_404(db, channel_id)


@router.patch("/{channel_id}", response_model=ChannelRead)
async def update_channel(
    channel_id: str,
    data: ChannelUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    channel = await _get_or_404(db, channel_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(channel, field, value)
    await db.commit()
    await db.refresh(channel)
    return channel


@router.delete("/{channel_id}", status_code=204)
async def delete_channel(
    channel_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    channel = await _get_or_404(db, channel_id)
    await db.delete(channel)
    await db.commit()


@router.post("/{channel_id}/test", status_code=200)
async def test_channel(
    channel_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """Send a test notification to this channel."""
    from app.services import notification_service
    channel = await _get_or_404(db, channel_id)
    ok, error = await notification_service._send_to_channel(
        channel=channel,
        title="Test Notification from Overwatch",
        message=f"Channel '{channel.name}' is configured and working correctly.",
        severity="low",
        status=None,
        incident_id=None,
        tags=["test"],
    )
    if not ok:
        raise HTTPException(status_code=502, detail=f"Delivery failed: {error}")
    return {"status": "delivered"}


async def _get_or_404(db: AsyncSession, channel_id: str) -> NotificationChannel:
    result = await db.execute(select(NotificationChannel).where(NotificationChannel.id == channel_id))
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    return channel
