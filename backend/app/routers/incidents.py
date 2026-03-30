from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.incident import Incident
from app.models.user import User
from app.schemas.incident import IncidentCreate, IncidentRead, IncidentUpdate, IncidentSummary, ParticipantRead, TimelineEventRead
from app.core.deps import get_current_user
from app.services import incident_service

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("", response_model=list[IncidentSummary])
async def list_incidents(
    status: str | None = Query(None),
    severity: str | None = Query(None),
    topic: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await incident_service.list_incidents(db, status=status, severity=severity, topic=topic, limit=limit, offset=offset)


@router.post("", response_model=IncidentRead, status_code=201)
async def create_incident(
    data: IncidentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await incident_service.create_incident(db, data, current_user)


@router.get("/{incident_id}", response_model=IncidentRead)
async def get_incident(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    incident = await incident_service.get_incident(db, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.patch("/{incident_id}", response_model=IncidentRead)
async def update_incident(
    incident_id: str,
    data: IncidentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = await _get_or_404(db, incident_id)
    return await incident_service.update_incident(db, incident, data, current_user)


@router.post("/{incident_id}/notes", response_model=TimelineEventRead, status_code=201)
async def add_note(
    incident_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = await _get_or_404(db, incident_id)
    note = body.get("note", "").strip()
    if not note:
        raise HTTPException(status_code=422, detail="note field is required")
    event = await incident_service.add_note(db, incident, note, current_user)
    return TimelineEventRead(
        id=event.id,
        event_type=event.event_type,
        description=event.description,
        user_id=event.user_id,
        user_name=current_user.name,
        created_at=event.created_at,
    )


@router.post("/{incident_id}/participants", response_model=ParticipantRead, status_code=201)
async def add_participant(
    incident_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = await _get_or_404(db, incident_id)
    user_id = body.get("user_id")
    role = body.get("role", "responder")
    if not user_id:
        raise HTTPException(status_code=422, detail="user_id required")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    participant = await incident_service.add_participant(db, incident, user, role, current_user)
    return ParticipantRead(
        id=participant.id,
        user_id=participant.user_id,
        role=participant.role,
        joined_at=participant.joined_at,
        user_name=user.name,
        user_email=user.email,
    )


async def _get_or_404(db: AsyncSession, incident_id: str) -> Incident:
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident
