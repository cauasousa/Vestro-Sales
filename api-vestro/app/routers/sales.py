import datetime as dt
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import get_current_admin
from app.schemas import (
    CalendarContextEntry,
    CalendarContextIn,
    SalesForecastResponse,
    SalesMLForecastResponse,
    SalesRetrainResponse,
)
from app.services import calendar_context as calendar_context_service
from app.services.forecast import get_ml_forecast, get_sales_forecast, retrain_model

router = APIRouter(prefix="/api/sales", tags=["sales"])

CALENDAR_CONTEXT_DEFAULT_WINDOW_DAYS = 60


@router.get("/forecast", response_model=SalesForecastResponse)
async def sales_forecast(
    _admin: Annotated[dict[str, Any], Depends(get_current_admin)],
) -> SalesForecastResponse:
    return await get_sales_forecast()


@router.get("/forecast-ml", response_model=SalesMLForecastResponse)
async def sales_forecast_ml(
    _admin: Annotated[dict[str, Any], Depends(get_current_admin)],
) -> SalesMLForecastResponse:
    return await get_ml_forecast()


@router.post("/retrain", response_model=SalesRetrainResponse)
async def sales_retrain(
    _admin: Annotated[dict[str, Any], Depends(get_current_admin)],
    holdout_days: Annotated[int, Query(ge=0, le=90)] = 14,
) -> SalesRetrainResponse:
    return await retrain_model(holdout_days)


@router.get("/calendar-context", response_model=list[CalendarContextEntry])
async def list_calendar_context_entries(
    _admin: Annotated[dict[str, Any], Depends(get_current_admin)],
    start: dt.date | None = Query(None, description="Defaults to today"),
    end: dt.date | None = Query(None, description="Defaults to start + 60 days"),
) -> list[CalendarContextEntry]:
    today = dt.datetime.now(dt.timezone.utc).date()
    range_start = start or today
    range_end = end or (range_start + dt.timedelta(days=CALENDAR_CONTEXT_DEFAULT_WINDOW_DAYS))
    return await calendar_context_service.list_calendar_context(range_start, range_end)


@router.post(
    "/calendar-context",
    response_model=CalendarContextEntry,
    status_code=status.HTTP_201_CREATED,
)
async def upsert_calendar_context_entry(
    payload: CalendarContextIn,
    _admin: Annotated[dict[str, Any], Depends(get_current_admin)],
) -> CalendarContextEntry:
    return await calendar_context_service.upsert_calendar_context(
        payload.date, payload.discount_rate, payload.has_event
    )


@router.delete("/calendar-context/{entry_date}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_calendar_context_entry(
    entry_date: dt.date,
    _admin: Annotated[dict[str, Any], Depends(get_current_admin)],
) -> None:
    deleted = await calendar_context_service.delete_calendar_context(entry_date)
    if not deleted:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No calendar context entry for this date")
