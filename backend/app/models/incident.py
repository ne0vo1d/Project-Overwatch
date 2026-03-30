import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, ForeignKey, Enum as SAEnum, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.database import Base


class Severity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class IncidentStatus(str, enum.Enum):
    new = "new"
    active = "active"
    stable = "stable"
    resolved = "resolved"
    closed = "closed"


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[Severity] = mapped_column(SAEnum(Severity), nullable=False, default=Severity.medium)
    status: Mapped[IncidentStatus] = mapped_column(SAEnum(IncidentStatus), nullable=False, default=IncidentStatus.new)
    topic: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    service_id: Mapped[str | None] = mapped_column(ForeignKey("services.id"), nullable=True)
    commander_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    service: Mapped["Service | None"] = relationship("Service", foreign_keys=[service_id])  # noqa: F821
    commander: Mapped["User | None"] = relationship(  # noqa: F821
        "User", back_populates="commanded_incidents", foreign_keys=[commander_id]
    )
    participants: Mapped[list["IncidentParticipant"]] = relationship(
        "IncidentParticipant", back_populates="incident", cascade="all, delete-orphan"
    )
    tasks: Mapped[list["Task"]] = relationship(  # noqa: F821
        "Task", back_populates="incident", cascade="all, delete-orphan"
    )
    timeline: Mapped[list["TimelineEvent"]] = relationship(  # noqa: F821
        "TimelineEvent", back_populates="incident", cascade="all, delete-orphan", order_by="TimelineEvent.created_at"
    )


class IncidentParticipant(Base):
    __tablename__ = "incident_participants"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id: Mapped[str] = mapped_column(ForeignKey("incidents.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    role: Mapped[str] = mapped_column(String, default="responder")
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    incident: Mapped["Incident"] = relationship("Incident", back_populates="participants")
    user: Mapped["User"] = relationship("User", back_populates="participations")  # noqa: F821
