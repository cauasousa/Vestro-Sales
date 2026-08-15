from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ChatMessage(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    from_: Literal["admin", "customer"] = Field(alias="from")
    text: str
    createdAt: str


class ChatMessageCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    text: str
    from_: Literal["admin", "customer"] = Field(alias="from")


class Conversation(BaseModel):
    customerId: str
    customerName: str
    messages: list[ChatMessage]
