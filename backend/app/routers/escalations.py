from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.escalation import EscalationPolicy, EscalationStep
from app.models.user import User
from app.schemas.escalation import (
    EscalationPolicyCreate, EscalationPolicyRead, EscalationPolicyUpdate, EscalationStepCreate,
)
from app.core.deps import get_current_user

router = APIRouter(prefix="/escalations", tags=["escalations"])


@router.get("", response_model=list[EscalationPolicyRead])
async def list_policies(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(EscalationPolicy)
        .options(selectinload(EscalationPolicy.steps))
        .order_by(EscalationPolicy.created_at)
    )
    return result.scalars().all()


@router.post("", response_model=EscalationPolicyRead, status_code=201)
async def create_policy(
    data: EscalationPolicyCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    policy = EscalationPolicy(
        name=data.name,
        description=data.description,
        service_id=data.service_id,
    )
    db.add(policy)
    await db.flush()

    for step_data in data.steps:
        db.add(EscalationStep(policy_id=policy.id, **step_data.model_dump()))

    await db.commit()
    return await _get_or_404(db, policy.id)


@router.get("/{policy_id}", response_model=EscalationPolicyRead)
async def get_policy(
    policy_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await _get_or_404(db, policy_id)


@router.patch("/{policy_id}", response_model=EscalationPolicyRead)
async def update_policy(
    policy_id: str,
    data: EscalationPolicyUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(EscalationPolicy).where(EscalationPolicy.id == policy_id))
    policy = result.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(policy, field, value)
    await db.commit()
    return await _get_or_404(db, policy_id)


@router.delete("/{policy_id}", status_code=204)
async def delete_policy(
    policy_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(EscalationPolicy).where(EscalationPolicy.id == policy_id))
    policy = result.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    await db.delete(policy)
    await db.commit()


@router.post("/{policy_id}/steps", response_model=EscalationPolicyRead, status_code=201)
async def add_step(
    policy_id: str,
    data: EscalationStepCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    await _get_or_404(db, policy_id)
    db.add(EscalationStep(policy_id=policy_id, **data.model_dump()))
    await db.commit()
    return await _get_or_404(db, policy_id)


@router.delete("/{policy_id}/steps/{step_id}", status_code=204)
async def delete_step(
    policy_id: str,
    step_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(EscalationStep).where(EscalationStep.id == step_id, EscalationStep.policy_id == policy_id)
    )
    step = result.scalar_one_or_none()
    if not step:
        raise HTTPException(status_code=404, detail="Step not found")
    await db.delete(step)
    await db.commit()


async def _get_or_404(db: AsyncSession, policy_id: str) -> EscalationPolicy:
    result = await db.execute(
        select(EscalationPolicy)
        .options(selectinload(EscalationPolicy.steps))
        .where(EscalationPolicy.id == policy_id)
    )
    policy = result.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    return policy
