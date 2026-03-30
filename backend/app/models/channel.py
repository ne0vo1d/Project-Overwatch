import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Boolean, JSON, ARRAY, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.database import Base


class ChannelType(str, enum.Enum):
    slack = "slack"
    teams = "teams"
    webhook = "webhook"
    ntfy = "ntfy"
    email = "email"


class NotificationChannel(Base):
    __tablename__ = "notification_channels"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[ChannelType] = mapped_column(SAEnum(ChannelType), nullable=False)
    # config holds type-specific settings:
    # slack:   {"webhook_url": "...", "channel": "#incidents", "bot_token": "..."}
    # teams:   {"webhook_url": "..."}
    # webhook: {"url": "...", "headers": {...}, "secret": "..."}
    # ntfy:    {"base_url": "...", "topic": "...", "token": "..."}
    config: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    # Subscribe this channel to these topics (empty = all topics)
    topics: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    # Only trigger for these severities (empty = all severities)
    severities: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    notifications: Mapped[list["Notification"]] = relationship(  # noqa: F821
        "Notification", back_populates="channel"
    )
