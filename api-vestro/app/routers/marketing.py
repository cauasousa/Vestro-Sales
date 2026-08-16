from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_admin
from app.schemas import MarketingEmailRequest, MarketingEmailResponse
from app.services.marketing_email import get_opted_in_emails, send_marketing_email

router = APIRouter(prefix="/api/marketing", tags=["marketing"])


@router.get("/opted-in-count", response_model=int)
async def opted_in_count(
    _admin: Annotated[dict[str, Any], Depends(get_current_admin)],
) -> int:
    return len(await get_opted_in_emails())


@router.post("/send", response_model=MarketingEmailResponse)
async def send(
    payload: MarketingEmailRequest,
    _admin: Annotated[dict[str, Any], Depends(get_current_admin)],
) -> MarketingEmailResponse:
    if payload.recipientMode == "manual" and not payload.manualEmails:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Add at least one recipient email")

    try:
        return await send_marketing_email(payload)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
