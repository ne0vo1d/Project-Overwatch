"""
Notification router — ntfy-compatible publish API + SSE subscribe endpoint.

Publish:  POST /notify/{topic}
Subscribe: GET /notify/{topic}/sse   (Server-Sent Events)
History:  GET /notify/{topic}
"""
from fastapi import APIRouter, Depends, Request, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationPublish, NotificationRead
from app.core.deps import get_current_user
from app.services import notification_service
from app.services.pubsub import subscribe

router = APIRouter(prefix="/notify", tags=["notifications"])


@router.post("/{topic}", response_model=list[NotificationRead], status_code=202)
async def publish(
    topic: str,
    data: NotificationPublish,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Publish a notification to a topic. Dispatches to all matching channels."""
    records = await notification_service.dispatch(
        db=db,
        topic=topic,
        title=data.title,
        message=data.message,
        priority=data.priority,
        tags=data.tags,
        incident_id=data.incident_id,
    )
    return records


@router.get("/{topic}/sse")
async def stream(topic: str, request: Request, _: User = Depends(get_current_user)):
    """
    Subscribe to real-time notifications for a topic via SSE.
    Use topic '*' to subscribe to all topics.
    """
    async def event_stream():
        async for chunk in subscribe(topic):
            if await request.is_disconnected():
                break
            yield chunk

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get("/{topic}", response_model=list[NotificationRead])
async def history(
    topic: str,
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Retrieve notification history for a topic."""
    query = (
        select(Notification)
        .where(Notification.topic == topic)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(query)
    return result.scalars().all()
