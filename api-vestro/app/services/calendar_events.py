import datetime as dt
from typing import Any

from app.db import get_supabase, run_maybe_single, run_query
from app.ml.calendar import derive_calendar_fields
from app.schemas import CalendarEvent, CalendarEventCreateRequest


def _row_to_event(row: dict[str, Any]) -> CalendarEvent:
    return CalendarEvent(
        id=row["id"],
        date=row["date"],
        name=row["name"],
        description=row.get("description"),
        createdAt=row["created_at"],
    )


async def list_events(start: dt.date, end: dt.date) -> list[CalendarEvent]:
    supabase = get_supabase()
    result = await run_query(
        lambda: supabase.table("calendar_events")
        .select("*")
        .gte("date", start.isoformat())
        .lte("date", end.isoformat())
        .order("date")
        .execute()
    )
    return [_row_to_event(row) for row in (result.data or [])]


async def _ensure_has_event(date: dt.date) -> None:
    """Flags calendar_context.has_event for this date so the ML forecast picks it up —
    one-directional (never clears it back to False on event delete, since a single
    boolean can't tell whether it was set by an event or by the admin directly via
    the calendar-context form; leaving a stale True is safer than clobbering that)."""
    supabase = get_supabase()
    existing = await run_maybe_single(
        lambda: supabase.table("calendar_context")
        .select("discount_rate, has_event")
        .eq("date", date.isoformat())
        .maybe_single()
        .execute()
    )
    if existing and existing.get("has_event"):
        return

    row = {
        "date": date.isoformat(),
        "discount_rate": existing["discount_rate"] if existing else 0,
        "has_event": True,
        **derive_calendar_fields(date),
    }
    await run_query(lambda: supabase.table("calendar_context").upsert(row, on_conflict="date").execute())


async def create_event(payload: CalendarEventCreateRequest) -> CalendarEvent:
    supabase = get_supabase()
    result = await run_query(
        lambda: supabase.table("calendar_events")
        .insert({"date": payload.date.isoformat(), "name": payload.name, "description": payload.description})
        .execute()
    )
    await _ensure_has_event(payload.date)
    return _row_to_event(result.data[0])


async def update_event(event_id: str, payload: CalendarEventCreateRequest) -> CalendarEvent | None:
    supabase = get_supabase()
    result = await run_query(
        lambda: supabase.table("calendar_events")
        .update({"date": payload.date.isoformat(), "name": payload.name, "description": payload.description})
        .eq("id", event_id)
        .execute()
    )
    if not result.data:
        return None
    await _ensure_has_event(payload.date)
    return _row_to_event(result.data[0])


async def delete_event(event_id: str) -> bool:
    supabase = get_supabase()
    result = await run_query(
        lambda: supabase.table("calendar_events").delete().eq("id", event_id).execute()
    )
    return bool(result.data)
