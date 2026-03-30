from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.metrics import MetricsSummary
from app.core.deps import get_current_user
from app.services.metrics_service import get_metrics

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("", response_model=MetricsSummary)
async def metrics(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await get_metrics(db)
