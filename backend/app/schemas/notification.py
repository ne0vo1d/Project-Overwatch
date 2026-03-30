from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.notification import NotificationStatus


class NotificationPublish(BaseModel):
    """ntfy-compatible publish schema. POST /notify/{topic}"""
    title: str
    message: str
    priority: str = "default"  # min/low/default/high/urgent
    tags: Optional[list[str]] = None
    incident_id: Optional[str] = None


class NotificationCreate(NotificationPublish):
    topic: str
    channel_id: Optional[str] = None


class NotificationRead(BaseModel):
    id: str
    topic: str
    title: str
    message: str
    priority: str
    tags: Optional[list[str]] = None
    incident_id: Optional[str] = None
    channel_id: Optional[str] = None
    status: NotificationStatus
    error: Optional[str] = None
    created_at: datetime
    sent_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
