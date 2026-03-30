import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, ForeignKey, Boolean, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class EscalationPolicy(Base):
    __tablename__ = "escalation_policies"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Attach to a specific service, or None = applies to all incidents
    service_id: Mapped[str | None] = mapped_column(ForeignKey("services.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    service: Mapped["Service | None"] = relationship("Service")  # noqa: F821
    steps: Mapped[list["EscalationStep"]] = relationship(
        "EscalationStep", back_populates="policy",
        cascade="all, delete-orphan", order_by="EscalationStep.step_order"
    )


class EscalationStep(Base):
    __tablename__ = "escalation_steps"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    policy_id: Mapped[str] = mapped_column(ForeignKey("escalation_policies.id"), nullable=False)
    step_order: Mapped[int] = mapped_column(Integer, nullable=False)
    delay_minutes: Mapped[int] = mapped_column(Integer, nullable=False)  # minutes after incident created
    # Who to notify — list of channel IDs
    notify_channel_ids: Mapped[list] = mapped_column(JSON, default=list)
    # Also page the current secondary on-call for the service
    notify_oncall_secondary: Mapped[bool] = mapped_column(Boolean, default=False)
    message_template: Mapped[str | None] = mapped_column(Text, nullable=True)

    policy: Mapped["EscalationPolicy"] = relationship("EscalationPolicy", back_populates="steps")


class EscalationEvent(Base):
    """Records which escalation steps have already been fired for an incident."""
    __tablename__ = "escalation_events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id: Mapped[str] = mapped_column(ForeignKey("incidents.id"), nullable=False)
    policy_id: Mapped[str] = mapped_column(ForeignKey("escalation_policies.id"), nullable=False)
    step_order: Mapped[int] = mapped_column(Integer, nullable=False)
    triggered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
