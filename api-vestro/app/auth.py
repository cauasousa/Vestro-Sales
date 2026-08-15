from typing import Annotated, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.db import get_supabase, get_supabase_anon, run_maybe_single, run_query

bearer_scheme = HTTPBearer(auto_error=False)


async def _decode_token(token: str) -> str:
    # Supabase issues ES256 (asymmetric) access tokens by default now, so we
    # can't just jwt.decode() with a shared HS256 secret — delegate
    # verification to Supabase Auth itself instead.
    supabase = get_supabase_anon()
    try:
        result = await run_query(lambda: supabase.auth.get_user(token))
    except Exception as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token") from exc

    user = getattr(result, "user", None)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    return user.id


async def _fetch_profile(user_id: str) -> dict[str, Any]:
    supabase = get_supabase()
    profile = await run_maybe_single(
        lambda: supabase.table("profiles")
        .select("id, email, full_name, role, created_at")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    if not profile:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No profile found for this user")
    return profile


async def get_current_profile(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict[str, Any]:
    """Require a valid Supabase Bearer token, return the caller's profile row."""
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    user_id = await _decode_token(credentials.credentials)
    return await _fetch_profile(user_id)


async def get_optional_profile(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict[str, Any] | None:
    """Same as get_current_profile, but returns None instead of 401 (guest checkout, etc)."""
    if credentials is None:
        return None
    user_id = await _decode_token(credentials.credentials)
    return await _fetch_profile(user_id)


async def get_current_admin(
    profile: Annotated[dict[str, Any], Depends(get_current_profile)],
) -> dict[str, Any]:
    if profile.get("role") != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin role required")
    return profile
