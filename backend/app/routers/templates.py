from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.template import IncidentTemplate
from app.models.user import User
from app.schemas.template import IncidentTemplateCreate, IncidentTemplateRead, IncidentTemplateUpdate
from app.core.deps import get_current_user

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("", response_model=list[IncidentTemplateRead])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(IncidentTemplate).order_by(IncidentTemplate.name))
    return result.scalars().all()


@router.post("", response_model=IncidentTemplateRead, status_code=201)
async def create_template(
    data: IncidentTemplateCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    template = IncidentTemplate(
        **{k: v for k, v in data.model_dump().items() if k != "tasks"},
        tasks=[t.model_dump() for t in data.tasks],
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


@router.get("/{template_id}", response_model=IncidentTemplateRead)
async def get_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await _get_or_404(db, template_id)


@router.patch("/{template_id}", response_model=IncidentTemplateRead)
async def update_template(
    template_id: str,
    data: IncidentTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(IncidentTemplate).where(IncidentTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    update_data = data.model_dump(exclude_none=True)
    if "tasks" in update_data:
        update_data["tasks"] = [t if isinstance(t, dict) else t.model_dump() for t in update_data["tasks"]]
    for field, value in update_data.items():
        setattr(template, field, value)
    await db.commit()
    await db.refresh(template)
    return template


@router.delete("/{template_id}", status_code=204)
async def delete_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(IncidentTemplate).where(IncidentTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    await db.delete(template)
    await db.commit()


async def _get_or_404(db: AsyncSession, template_id: str) -> IncidentTemplate:
    result = await db.execute(select(IncidentTemplate).where(IncidentTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template
