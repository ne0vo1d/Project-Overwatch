from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.service import Service, ServiceMember
from app.models.user import User
from app.schemas.service import ServiceCreate, ServiceRead, ServiceUpdate, ServiceMemberRead
from app.core.deps import get_current_user

router = APIRouter(prefix="/services", tags=["services"])


@router.get("", response_model=list[ServiceRead])
async def list_services(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Service)
        .options(selectinload(Service.members).selectinload(ServiceMember.user))
        .order_by(Service.name)
    )
    return result.scalars().all()


@router.post("", response_model=ServiceRead, status_code=201)
async def create_service(
    data: ServiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = await db.execute(select(Service).where(Service.slug == data.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Service slug already exists")

    service = Service(**data.model_dump())
    db.add(service)
    await db.flush()

    # Auto-add creator as owner member
    db.add(ServiceMember(service_id=service.id, user_id=current_user.id, role="owner"))
    await db.commit()
    return await _get_or_404(db, service.id)


@router.get("/{service_id}", response_model=ServiceRead)
async def get_service(
    service_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await _get_or_404(db, service_id)


@router.patch("/{service_id}", response_model=ServiceRead)
async def update_service(
    service_id: str,
    data: ServiceUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(service, field, value)
    await db.commit()
    return await _get_or_404(db, service_id)


@router.delete("/{service_id}", status_code=204)
async def delete_service(
    service_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(Service).where(Service.id == service_id))
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    await db.delete(service)
    await db.commit()


@router.post("/{service_id}/members", response_model=ServiceMemberRead, status_code=201)
async def add_member(
    service_id: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    await _get_or_404(db, service_id)
    user_id = body.get("user_id")
    role = body.get("role", "member")
    if not user_id:
        raise HTTPException(status_code=422, detail="user_id required")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = await db.execute(
        select(ServiceMember).where(ServiceMember.service_id == service_id, ServiceMember.user_id == user_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="User already a member")

    member = ServiceMember(service_id=service_id, user_id=user_id, role=role)
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return ServiceMemberRead(
        id=member.id, user_id=member.user_id, role=member.role,
        user_name=user.name, user_email=user.email, created_at=member.created_at,
    )


@router.delete("/{service_id}/members/{user_id}", status_code=204)
async def remove_member(
    service_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ServiceMember).where(ServiceMember.service_id == service_id, ServiceMember.user_id == user_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    await db.delete(member)
    await db.commit()


async def _get_or_404(db: AsyncSession, service_id: str) -> Service:
    result = await db.execute(
        select(Service)
        .options(selectinload(Service.members).selectinload(ServiceMember.user))
        .where(Service.id == service_id)
    )
    service = result.scalar_one_or_none()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service
