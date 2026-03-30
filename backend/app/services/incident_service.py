"""Incident lifecycle management with automatic timeline events and notifications."""
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.incident import Incident, IncidentParticipant, IncidentStatus
from app.models.timeline import TimelineEvent
from app.models.user import User
from app.schemas.incident import IncidentCreate, IncidentUpdate
from app.services import notification_service


async def create_incident(
    db: AsyncSession,
    data: IncidentCreate,
    creator: User,
) -> Incident:
    incident = Incident(
        title=data.title,
        description=data.description,
        severity=data.severity,
        topic=data.topic or f"incidents",
        tags=data.tags,
        commander_id=data.commander_id or creator.id,
    )
    db.add(incident)
    await db.flush()

    # Add creator as participant
    participant = IncidentParticipant(
        incident_id=incident.id,
        user_id=creator.id,
        role="commander" if not data.commander_id or data.commander_id == creator.id else "reporter",
    )
    db.add(participant)

    # Timeline event
    event = TimelineEvent(
        incident_id=incident.id,
        user_id=creator.id,
        event_type="created",
        description=f"Incident created by {creator.name}",
        metadata_={"severity": incident.severity.value, "status": incident.status.value},
    )
    db.add(event)
    await db.commit()
    await db.refresh(incident)

    # Dispatch notifications
    await notification_service.dispatch(
        db=db,
        topic=incident.topic or "incidents",
        title=f"New Incident: {incident.title}",
        message=incident.description or "No description provided.",
        priority="high" if incident.severity.value in ("critical", "high") else "default",
        tags=incident.tags or [],
        incident_id=incident.id,
        severity=incident.severity.value,
        status=incident.status.value,
    )

    return await get_incident(db, incident.id)


async def update_incident(
    db: AsyncSession,
    incident: Incident,
    data: IncidentUpdate,
    actor: User,
) -> Incident:
    changes = []
    old_status = incident.status

    for field, value in data.model_dump(exclude_none=True).items():
        old = getattr(incident, field)
        if old != value:
            setattr(incident, field, value)
            changes.append(f"{field}: {old!r} → {value!r}")

    if data.status == IncidentStatus.resolved and old_status != IncidentStatus.resolved:
        incident.resolved_at = datetime.now(timezone.utc)

    incident.updated_at = datetime.now(timezone.utc)

    if changes:
        event = TimelineEvent(
            incident_id=incident.id,
            user_id=actor.id,
            event_type="updated",
            description=f"Incident updated by {actor.name}: {'; '.join(changes)}",
            metadata_={"changes": changes},
        )
        db.add(event)

    await db.commit()
    await db.refresh(incident)

    # Dispatch status-change notification
    if data.status and data.status != old_status:
        await notification_service.dispatch(
            db=db,
            topic=incident.topic or "incidents",
            title=f"Incident {data.status.value.title()}: {incident.title}",
            message=f"Status changed from {old_status.value} to {data.status.value} by {actor.name}.",
            priority="urgent" if data.status == IncidentStatus.active else "default",
            tags=incident.tags or [],
            incident_id=incident.id,
            severity=incident.severity.value,
            status=incident.status.value,
        )

    return await get_incident(db, incident.id)


async def add_note(
    db: AsyncSession,
    incident: Incident,
    note: str,
    actor: User,
) -> TimelineEvent:
    event = TimelineEvent(
        incident_id=incident.id,
        user_id=actor.id,
        event_type="note",
        description=note,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


async def add_participant(
    db: AsyncSession,
    incident: Incident,
    user: User,
    role: str,
    actor: User,
) -> IncidentParticipant:
    existing = await db.execute(
        select(IncidentParticipant).where(
            IncidentParticipant.incident_id == incident.id,
            IncidentParticipant.user_id == user.id,
        )
    )
    if existing.scalar_one_or_none():
        from fastapi import HTTPException
        raise HTTPException(status_code=409, detail="User is already a participant")

    participant = IncidentParticipant(incident_id=incident.id, user_id=user.id, role=role)
    db.add(participant)

    event = TimelineEvent(
        incident_id=incident.id,
        user_id=actor.id,
        event_type="participant_added",
        description=f"{user.name} added as {role} by {actor.name}",
    )
    db.add(event)
    await db.commit()
    await db.refresh(participant)
    return participant


async def get_incident(db: AsyncSession, incident_id: str) -> Incident | None:
    result = await db.execute(
        select(Incident)
        .options(
            selectinload(Incident.participants).selectinload(IncidentParticipant.user),
            selectinload(Incident.timeline).selectinload(TimelineEvent.user),
            selectinload(Incident.commander),
        )
        .where(Incident.id == incident_id)
    )
    return result.scalar_one_or_none()


async def list_incidents(
    db: AsyncSession,
    status: str | None = None,
    severity: str | None = None,
    topic: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Incident]:
    query = select(Incident).options(
        selectinload(Incident.participants).selectinload(IncidentParticipant.user),
        selectinload(Incident.commander),
    ).order_by(Incident.created_at.desc()).limit(limit).offset(offset)

    if status:
        query = query.where(Incident.status == status)
    if severity:
        query = query.where(Incident.severity == severity)
    if topic:
        query = query.where(Incident.topic == topic)

    result = await db.execute(query)
    return list(result.scalars().all())
