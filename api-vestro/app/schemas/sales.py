import datetime as dt

from pydantic import BaseModel, Field


class SalesForecastPoint(BaseModel):
    date: str
    actual: float | None = None
    predicted: float | None = None


class SalesForecastResponse(BaseModel):
    history: list[SalesForecastPoint]
    forecast: list[SalesForecastPoint]


class SalesMLForecastResponse(BaseModel):
    forecast: list[SalesForecastPoint]
    model_available: bool


class SalesRetrainResponse(BaseModel):
    trained_days: int
    holdout_days: int
    holdout_mae: float | None = None
    model_path: str


class CalendarContextIn(BaseModel):
    """The two calendar_context fields that are actually business decisions —
    nothing else here is admin input, see docs/machine-learning.md."""

    date: dt.date
    discount_rate: float = Field(0, ge=0, le=1, description="Planned promotion for this day, 0-1")
    has_event: bool = Field(False, description="Planned marketing push (email, ads, influencer) for this day")


class CalendarContextEntry(BaseModel):
    date: str
    is_payday: bool
    is_end_of_month: bool
    days_until_holiday: int
    discount_rate: float
    is_holiday: bool
    has_event: bool
