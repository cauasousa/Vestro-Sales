from functools import lru_cache
from typing import Any, Callable, TypeVar

from fastapi import HTTPException, status
from starlette.concurrency import run_in_threadpool
from supabase import Client, create_client

from app.config import get_settings

T = TypeVar("T")


@lru_cache
def get_supabase() -> Client:
    """Service-role client — bypasses RLS, used for all table reads/writes and admin auth ops."""
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing).",
        )
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


@lru_cache
def get_supabase_anon() -> Client:
    """Anon-key client — used for Supabase Auth flows (sign up/in) exactly like a browser would."""
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Supabase is not configured (SUPABASE_URL / SUPABASE_ANON_KEY missing).",
        )
    return create_client(settings.supabase_url, settings.supabase_anon_key)


async def run_query(fn: Callable[[], T]) -> T:
    """Run a blocking supabase-py call off the event loop."""
    return await run_in_threadpool(fn)


async def run_maybe_single(fn: Callable[[], Any]) -> dict[str, Any] | None:
    """Run a `.maybe_single().execute()` query and return its row (or None).

    The installed postgrest-py version returns `None` outright (not a response
    object with `.data = None`) when zero rows match, so callers that do
    `result.data` on it crash with AttributeError instead of getting a clean
    not-found. This normalizes both shapes into a plain `dict | None`.
    """
    result = await run_in_threadpool(fn)
    return result.data if result is not None else None
