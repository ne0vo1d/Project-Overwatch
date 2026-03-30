import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    api_key: Mapped[str] = mapped_column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    slack_user_id: Mapped[str | None] = mapped_column(String, nullable=True)
    teams_user_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    commanded_incidents: Mapped[list["Incident"]] = relationship(  # noqa: F821
        "Incident", back_populates="commander", foreign_keys="Incident.commander_id"
    )
    participations: Mapped[list["IncidentParticipant"]] = relationship(  # noqa: F821
        "IncidentParticipant", back_populates="user"
    )
    tasks: Mapped[list["Task"]] = relationship("Task", back_populates="assignee")  # noqa: F821
    timeline_events: Mapped[list["TimelineEvent"]] = relationship("TimelineEvent", back_populates="user")  # noqa: F821
