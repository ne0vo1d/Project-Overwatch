import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class OnCallSchedule(Base):
    __tablename__ = "oncall_schedules"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    service_id: Mapped[str | None] = mapped_column(ForeignKey("services.id"), nullable=True)
    timezone: Mapped[str] = mapped_column(String, default="UTC")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    service: Mapped["Service | None"] = relationship("Service", back_populates="schedules")  # noqa: F821
    entries: Mapped[list["OnCallEntry"]] = relationship(
        "OnCallEntry", back_populates="schedule", cascade="all, delete-orphan",
        order_by="OnCallEntry.start_at"
    )


class OnCallEntry(Base):
    """A single on-call rotation slot: user is on-call from start_at to end_at."""
    __tablename__ = "oncall_entries"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    schedule_id: Mapped[str] = mapped_column(ForeignKey("oncall_schedules.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    role: Mapped[str] = mapped_column(String, default="primary")  # primary / secondary

    schedule: Mapped["OnCallSchedule"] = relationship("OnCallSchedule", back_populates="entries")
    user: Mapped["User"] = relationship("User")  # noqa: F821
