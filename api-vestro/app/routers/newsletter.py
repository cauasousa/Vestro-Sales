from fastapi import APIRouter, status
from pydantic import BaseModel, EmailStr

from app.db import get_supabase, run_query

router = APIRouter(prefix="/api/newsletter", tags=["newsletter"])


class NewsletterSubscribeRequest(BaseModel):
    email: EmailStr


@router.post("/subscribe", status_code=status.HTTP_204_NO_CONTENT)
async def subscribe(payload: NewsletterSubscribeRequest) -> None:
    supabase = get_supabase()
    await run_query(
        lambda: supabase.table("newsletter_subscribers")
        .upsert({"email": payload.email, "unsubscribed_at": None}, on_conflict="email")
        .execute()
    )
