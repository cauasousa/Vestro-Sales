from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_admin, get_current_profile
from app.schemas import ChatMessageCreateRequest, ChatReport, ChatReportRequest, Conversation
from app.services.chat import add_message, get_conversation, list_conversations, report_conversation

router = APIRouter(prefix="/api/chat", tags=["chat"])


def _require_owner_or_admin(profile: dict[str, Any], customer_id: str) -> None:
    if profile["id"] != customer_id and profile["role"] != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not allowed")


@router.get("/conversations", response_model=list[Conversation])
async def conversations(
    _admin: Annotated[dict[str, Any], Depends(get_current_admin)],
) -> list[Conversation]:
    return await list_conversations()


@router.get("/conversations/{customer_id}", response_model=Conversation)
async def conversation(
    customer_id: str,
    profile: Annotated[dict[str, Any], Depends(get_current_profile)],
) -> Conversation:
    _require_owner_or_admin(profile, customer_id)
    return await get_conversation(customer_id)


@router.post("/conversations/{customer_id}/messages", response_model=Conversation)
async def post_message(
    customer_id: str,
    payload: ChatMessageCreateRequest,
    profile: Annotated[dict[str, Any], Depends(get_current_profile)],
) -> Conversation:
    _require_owner_or_admin(profile, customer_id)
    return await add_message(customer_id, payload.text, payload.from_, payload.orderId)


@router.post("/conversations/{customer_id}/report", response_model=ChatReport, status_code=status.HTTP_201_CREATED)
async def report(
    customer_id: str,
    payload: ChatReportRequest,
    profile: Annotated[dict[str, Any], Depends(get_current_profile)],
) -> ChatReport:
    _require_owner_or_admin(profile, customer_id)
    return await report_conversation(customer_id, payload.reason)
