import datetime as dt

from pydantic import BaseModel, Field


class CalendarEventCreateRequest(BaseModel):
    date: dt.date
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None


class CalendarEvent(BaseModel):
    id: str
    date: str
    name: str
    description: str | None = None
    createdAt: str
