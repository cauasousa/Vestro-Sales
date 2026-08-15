from pydantic import BaseModel


class SalesForecastPoint(BaseModel):
    date: str
    actual: float | None = None
    predicted: float | None = None


class SalesForecastResponse(BaseModel):
    history: list[SalesForecastPoint]
    forecast: list[SalesForecastPoint]
