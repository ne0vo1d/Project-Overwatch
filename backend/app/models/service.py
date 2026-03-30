import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Text, ForeignKey, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Service(Base):
    __tablename__ = "services"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    # Tags used to match incoming alerts (e.g. "database", "payments", "prod")
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    # Default notification topic for this service's incidents
    topic: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    owner: Mapped["User | None"] = relationship("User", foreign_keys=[owner_id])  # noqa: F821
    members: Mapped[list["ServiceMember"]] = relationship(
        "ServiceMember", back_populates="service", cascade="all, delete-orphan"
    )
    schedules: Mapped[list["OnCallSchedule"]] = relationship(  # noqa: F821
        "OnCallSchedule", back_populates="service"
    )


class ServiceMember(Base):
    __tablename__ = "service_members"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    service_id: Mapped[str] = mapped_column(ForeignKey("services.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    role: Mapped[str] = mapped_column(String, default="member")  # owner / member / oncall
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    service: Mapped["Service"] = relationship("Service", back_populates="members")
    user: Mapped["User"] = relationship("User")  # noqa: F821
