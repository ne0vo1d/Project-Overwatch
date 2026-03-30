from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.incident import Severity, IncidentStatus


class ParticipantRead(BaseModel):
    id: str
    user_id: str
    role: str
    joined_at: datetime
    user_name: Optional[str] = None
    user_email: Optional[str] = None

    model_config = {"from_attributes": True}


class IncidentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    severity: Severity = Severity.medium
    topic: Optional[str] = None
    tags: list[str] = []
    commander_id: Optional[str] = None


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[Severity] = None
    status: Optional[IncidentStatus] = None
    topic: Optional[str] = None
    tags: Optional[list[str]] = None
    commander_id: Optional[str] = None


class IncidentSummary(BaseModel):
    id: str
    title: str
    severity: Severity
    status: IncidentStatus
    topic: Optional[str] = None
    tags: list[str] = []
    commander_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TimelineEventRead(BaseModel):
    id: str
    event_type: str
    description: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class IncidentRead(IncidentSummary):
    description: Optional[str] = None
    participants: list[ParticipantRead] = []
    timeline: list[TimelineEventRead] = []
