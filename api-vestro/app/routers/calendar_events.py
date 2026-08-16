import datetime as dt
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import get_current_admin
from app.schemas import CalendarEvent, CalendarEventCreateRequest
from app.services import calendar_events as calendar_events_service

router = APIRouter(prefix="/api/sales/calendar-events", tags=["calendar-events"])

DEFAULT_WINDOW_DAYS = 60


@router.get("", response_model=list[CalendarEvent])
async def list_calendar_events(
    _admin: Annotated[dict[str, Any], Depends(get_current_admin)],
    start: dt.date | None = Query(None, description="Defaults to today"),
    end: dt.date | None = Query(None, description="Defaults to start + 60 days"),
) -> list[CalendarEvent]:
    today = dt.datetime.now(dt.timezone.utc).date()
    range_start = start or today
    range_end = end or (range_start + dt.timedelta(days=DEFAULT_WINDOW_DAYS))
    return await calendar_events_service.list_events(range_start, range_end)


@router.post("", response_model=CalendarEvent, status_code=status.HTTP_201_CREATED)
async def create_calendar_event(
    payload: CalendarEventCreateRequest,
    _admin: Annotated[dict[str, Any], Depends(get_current_admin)],
) -> CalendarEvent:
    return await calendar_events_service.create_event(payload)


@router.patch("/{event_id}", response_model=CalendarEvent)
async def update_calendar_event(
    event_id: str,
    payload: CalendarEventCreateRequest,
    _admin: Annotated[dict[str, Any], Depends(get_current_admin)],
) -> CalendarEvent:
    updated = await calendar_events_service.update_event(event_id, payload)
    if not updated:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
    return updated


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_calendar_event(
    event_id: str,
    _admin: Annotated[dict[str, Any], Depends(get_current_admin)],
) -> None:
    deleted = await calendar_events_service.delete_event(event_id)
    if not deleted:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
