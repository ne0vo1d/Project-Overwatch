import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, ForeignKey, JSON, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.database import Base


class NotificationStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    failed = "failed"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    topic: Mapped[str] = mapped_column(String, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(String, default="default")  # min/low/default/high/urgent
    tags: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    incident_id: Mapped[str | None] = mapped_column(ForeignKey("incidents.id"), nullable=True)
    channel_id: Mapped[str | None] = mapped_column(ForeignKey("notification_channels.id"), nullable=True)
    status: Mapped[NotificationStatus] = mapped_column(SAEnum(NotificationStatus), default=NotificationStatus.pending)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    channel: Mapped["NotificationChannel | None"] = relationship(  # noqa: F821
        "NotificationChannel", back_populates="notifications"
    )
