import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, ForeignKey, JSON, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.incident import Severity


class IncidentTemplate(Base):
    __tablename__ = "incident_templates"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Pre-fill values for new incidents
    incident_title_template: Mapped[str | None] = mapped_column(String, nullable=True)
    incident_description_template: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[Severity] = mapped_column(SAEnum(Severity), nullable=False, default=Severity.medium)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)
    topic: Mapped[str | None] = mapped_column(String, nullable=True)
    service_id: Mapped[str | None] = mapped_column(ForeignKey("services.id"), nullable=True)
    runbook_url: Mapped[str | None] = mapped_column(String, nullable=True)
    # Pre-created tasks (list of {"title": "...", "description": "..."})
    tasks: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    service: Mapped["Service | None"] = relationship("Service")  # noqa: F821
