from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ChatMessage(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    from_: Literal["admin", "customer"] = Field(alias="from")
    text: str
    orderId: str | None = None
    createdAt: str


class ChatMessageCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    text: str
    from_: Literal["admin", "customer"] = Field(alias="from")
    orderId: str | None = None


class Conversation(BaseModel):
    id: str | None = None
    customerId: str
    customerName: str
    messages: list[ChatMessage]
    reported: bool = False


class ChatReportRequest(BaseModel):
    reason: str | None = None


class ChatReport(BaseModel):
    id: str
    conversationId: str
    reason: str | None = None
    createdAt: str
