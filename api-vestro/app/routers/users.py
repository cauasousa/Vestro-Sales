from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_admin
from app.db import get_supabase, run_maybe_single, run_query
from app.schemas import Profile, UserCreateRequest

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[Profile])
async def list_users(
    _admin: Annotated[dict[str, Any], Depends(get_current_admin)],
) -> list[Profile]:
    supabase = get_supabase()
    result = await run_query(
        lambda: supabase.table("profiles")
        .select("id, email, full_name, role, created_at")
        .execute()
    )
    return result.data or []


@router.post("", response_model=Profile, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreateRequest,
    _admin: Annotated[dict[str, Any], Depends(get_current_admin)],
) -> Profile:
    supabase = get_supabase()

    try:
        auth_result = await run_query(
            lambda: supabase.auth.admin.create_user(
                {
                    "email": payload.email,
                    "password": payload.password,
                    "email_confirm": True,
                    "user_metadata": {"full_name": payload.full_name},
                }
            )
        )
    except Exception as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc

    user_id = auth_result.user.id

    if payload.role != "customer":
        await run_query(
            lambda: supabase.table("profiles")
            .update({"role": payload.role})
            .eq("id", user_id)
            .execute()
        )

    profile = await run_maybe_single(
        lambda: supabase.table("profiles")
        .select("id, email, full_name, role, created_at")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    return profile
