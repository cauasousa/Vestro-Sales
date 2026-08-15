from typing import Annotated, Any

from fastapi import APIRouter, Depends

from app.auth import get_current_admin
from app.schemas import SalesForecastResponse
from app.services.forecast import get_sales_forecast

router = APIRouter(prefix="/api/sales", tags=["sales"])


@router.get("/forecast", response_model=SalesForecastResponse)
async def sales_forecast(
    _admin: Annotated[dict[str, Any], Depends(get_current_admin)],
) -> SalesForecastResponse:
    return await get_sales_forecast()
