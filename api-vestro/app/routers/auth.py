from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_profile
from app.db import get_supabase, get_supabase_anon, run_maybe_single, run_query
from app.schemas import AuthResponse, LoginRequest, Profile, RegisterRequest, Session

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _session_from_supabase(session: Any) -> Session | None:
    if session is None:
        return None
    return Session(
        access_token=session.access_token,
        refresh_token=session.refresh_token,
        expires_at=session.expires_at,
    )


async def _profile_for(user_id: str) -> Profile:
    supabase = get_supabase()
    profile = await run_maybe_single(
        lambda: supabase.table("profiles")
        .select("id, email, full_name, role, created_at")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    if not profile:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Profile not found")
    return Profile(**profile)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest) -> AuthResponse:
    anon = get_supabase_anon()
    try:
        auth_result = await run_query(
            lambda: anon.auth.sign_up(
                {
                    "email": payload.email,
                    "password": payload.password,
                    "options": {"data": {"full_name": payload.full_name}},
                }
            )
        )
    except Exception as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc

    if not auth_result.user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Registration failed")

    profile = await _profile_for(auth_result.user.id)
    return AuthResponse(user=profile, session=_session_from_supabase(auth_result.session))


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest) -> AuthResponse:
    anon = get_supabase_anon()
    try:
        auth_result = await run_query(
            lambda: anon.auth.sign_in_with_password(
                {"email": payload.email, "password": payload.password}
            )
        )
    except Exception as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password") from exc

    profile = await _profile_for(auth_result.user.id)
    return AuthResponse(user=profile, session=_session_from_supabase(auth_result.session))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    _profile: Annotated[dict[str, Any], Depends(get_current_profile)],
) -> None:
    return None


@router.get("/me", response_model=Profile)
async def me(
    profile: Annotated[dict[str, Any], Depends(get_current_profile)],
) -> Profile:
    return Profile(**profile)
