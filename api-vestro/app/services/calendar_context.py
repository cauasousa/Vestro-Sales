import datetime as dt

from app.db import get_supabase, run_query
from app.ml.calendar import derive_calendar_fields
from app.schemas import CalendarContextEntry


async def list_calendar_context(start: dt.date, end: dt.date) -> list[CalendarContextEntry]:
    supabase = get_supabase()
    result = await run_query(
        lambda: supabase.table("calendar_context")
        .select("*")
        .gte("date", start.isoformat())
        .lte("date", end.isoformat())
        .order("date")
        .execute()
    )
    return result.data or []


async def upsert_calendar_context(
    date: dt.date, discount_rate: float, has_event: bool
) -> CalendarContextEntry:
    supabase = get_supabase()
    row = {
        "date": date.isoformat(),
        "discount_rate": discount_rate,
        "has_event": has_event,
        **derive_calendar_fields(date),
    }
    result = await run_query(
        lambda: supabase.table("calendar_context").upsert(row, on_conflict="date").execute()
    )
    return result.data[0]


async def delete_calendar_context(date: dt.date) -> bool:
    supabase = get_supabase()
    result = await run_query(
        lambda: supabase.table("calendar_context").delete().eq("date", date.isoformat()).execute()
    )
    return bool(result.data)
