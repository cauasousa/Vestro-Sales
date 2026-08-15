from typing import Annotated, Any

from fastapi import APIRouter, Depends

from app.auth import get_current_admin
from app.schemas import MetricsSummary
from app.services.metrics import get_metrics_summary

router = APIRouter(prefix="/api/metrics", tags=["metrics"])


@router.get("/summary", response_model=MetricsSummary)
async def metrics_summary(
    _admin: Annotated[dict[str, Any], Depends(get_current_admin)],
) -> MetricsSummary:
    return await get_metrics_summary()
