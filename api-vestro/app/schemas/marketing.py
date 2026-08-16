from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class MarketingEmailRequest(BaseModel):
    recipientMode: Literal["opted_in", "manual"]
    manualEmails: list[EmailStr] = Field(default_factory=list)
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1)


class MarketingEmailResponse(BaseModel):
    recipientCount: int
    sentCount: int
    failedEmails: list[str] = Field(default_factory=list)
