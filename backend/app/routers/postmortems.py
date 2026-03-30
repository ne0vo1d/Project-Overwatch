from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.incident import Incident
from app.models.postmortem import Postmortem
from app.models.user import User
from app.schemas.postmortem import PostmortemRead, PostmortemUpdate
from app.core.deps import get_current_user
from app.services import postmortem_service

router = APIRouter(prefix="/incidents/{incident_id}/postmortem", tags=["postmortems"])


@router.post("", response_model=PostmortemRead, status_code=201)
async def generate_postmortem(
    incident_id: str,
    force: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate (or regenerate) a postmortem for an incident from its timeline."""
    incident = await _get_incident_or_404(db, incident_id)
    pm = await postmortem_service.get_or_generate(db, incident, current_user, force_regenerate=force)
    return _enrich(pm)


@router.get("", response_model=PostmortemRead)
async def get_postmortem(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    pm = await _get_pm_or_404(db, incident_id)
    return _enrich(pm)


@router.get("/raw", response_class=PlainTextResponse)
async def download_postmortem(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return raw Markdown — suitable for saving as .md file."""
    pm = await _get_pm_or_404(db, incident_id)
    return pm.content


@router.patch("", response_model=PostmortemRead)
async def update_postmortem(
    incident_id: str,
    data: PostmortemUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Manually edit the postmortem content."""
    pm = await _get_pm_or_404(db, incident_id)
    pm.content = data.content
    from datetime import datetime, timezone
    pm.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(pm)
    return _enrich(pm)


def _enrich(pm: Postmortem) -> PostmortemRead:
    return PostmortemRead(
        id=pm.id,
        incident_id=pm.incident_id,
        content=pm.content,
        created_by=pm.created_by,
        author_name=pm.author.name if pm.author else None,
        created_at=pm.created_at,
        updated_at=pm.updated_at,
    )


async def _get_incident_or_404(db: AsyncSession, incident_id: str) -> Incident:
    result = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


async def _get_pm_or_404(db: AsyncSession, incident_id: str) -> Postmortem:
    result = await db.execute(
        select(Postmortem).where(Postmortem.incident_id == incident_id)
    )
    pm = result.scalar_one_or_none()
    if not pm:
        raise HTTPException(status_code=404, detail="No postmortem yet — POST to generate one")
    return pm
