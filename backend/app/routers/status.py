"""
Public status page endpoint — no authentication required.
Returns current open incidents grouped by service, plus overall health.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.incident import Incident, IncidentStatus, Severity
from app.models.service import Service

router = APIRouter(prefix="/status", tags=["status"])


class PublicIncident(BaseModel):
    id: str
    title: str
    severity: str
    status: str
    topic: Optional[str]
    created_at: datetime
    updated_at: datetime


class ServiceStatus(BaseModel):
    service_id: str
    service_name: str
    service_slug: str
    health: str              # operational | degraded | major_outage
    open_incidents: list[PublicIncident]


class StatusPage(BaseModel):
    overall: str             # operational | degraded | major_outage
    updated_at: datetime
    services: list[ServiceStatus]
    unattached_incidents: list[PublicIncident]  # incidents with no service


def _health_from_incidents(incidents: list) -> str:
    if not incidents:
        return "operational"
    severities = {i.severity for i in incidents}
    if Severity.critical in severities:
        return "major_outage"
    return "degraded"


@router.get("", response_model=StatusPage)
async def public_status(db: AsyncSession = Depends(get_db)):
    open_statuses = [IncidentStatus.new, IncidentStatus.active, IncidentStatus.stable]

    incidents_result = await db.execute(
        select(Incident)
        .where(Incident.status.in_(open_statuses))
        .order_by(Incident.created_at.desc())
    )
    all_open = list(incidents_result.scalars().all())

    services_result = await db.execute(select(Service).order_by(Service.name))
    services = list(services_result.scalars().all())

    now = datetime.now(timezone.utc)
    service_statuses: list[ServiceStatus] = []

    for svc in services:
        svc_incidents = [i for i in all_open if i.service_id == svc.id]
        service_statuses.append(ServiceStatus(
            service_id=svc.id,
            service_name=svc.name,
            service_slug=svc.slug,
            health=_health_from_incidents(svc_incidents),
            open_incidents=[_to_public(i) for i in svc_incidents],
        ))

    unattached = [i for i in all_open if not i.service_id]

    # Overall health = worst service + unattached
    all_healths = [s.health for s in service_statuses]
    if unattached:
        all_healths.append(_health_from_incidents(unattached))

    if "major_outage" in all_healths:
        overall = "major_outage"
    elif "degraded" in all_healths:
        overall = "degraded"
    else:
        overall = "operational"

    return StatusPage(
        overall=overall,
        updated_at=now,
        services=service_statuses,
        unattached_incidents=[_to_public(i) for i in unattached],
    )


def _to_public(i: Incident) -> PublicIncident:
    return PublicIncident(
        id=i.id,
        title=i.title,
        severity=i.severity.value,
        status=i.status.value,
        topic=i.topic,
        created_at=i.created_at,
        updated_at=i.updated_at,
    )
