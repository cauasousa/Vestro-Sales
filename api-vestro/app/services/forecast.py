import datetime as dt

from app.db import get_supabase, run_query
from app.schemas import SalesForecastPoint, SalesForecastResponse

HISTORY_DAYS = 7
FORECAST_DAYS = 7


def _daily_totals(rows: list[dict], start: dt.date, days: int) -> dict[dt.date, float]:
    totals: dict[dt.date, float] = {start + dt.timedelta(days=i): 0.0 for i in range(days)}
    for row in rows:
        created = dt.datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")).date()
        if created in totals:
            totals[created] += float(row["total_amount"])
    return totals


def _linear_forecast(values: list[float], horizon: int) -> list[float]:
    """Least-squares trend line fit over `values`, projected `horizon` steps ahead."""
    n = len(values)
    if n == 0:
        return [0.0] * horizon
    if n == 1:
        return [values[0]] * horizon

    x_mean = (n - 1) / 2
    y_mean = sum(values) / n
    numerator = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(values))
    denominator = sum((i - x_mean) ** 2 for i in range(n)) or 1.0
    slope = numerator / denominator
    intercept = y_mean - slope * x_mean

    return [max(0.0, intercept + slope * (n - 1 + step)) for step in range(1, horizon + 1)]


async def get_sales_forecast() -> SalesForecastResponse:
    supabase = get_supabase()
    today = dt.datetime.now(dt.timezone.utc).date()
    start = today - dt.timedelta(days=HISTORY_DAYS - 1)

    result = await run_query(
        lambda: supabase.table("sales")
        .select("total_amount, created_at")
        .gte("created_at", start.isoformat())
        .execute()
    )
    totals = _daily_totals(result.data or [], start, HISTORY_DAYS)
    ordered_days = sorted(totals)

    history = [
        SalesForecastPoint(date=day.isoformat(), actual=round(totals[day], 2), predicted=None)
        for day in ordered_days
    ]

    predicted_values = _linear_forecast([totals[day] for day in ordered_days], FORECAST_DAYS)
    forecast_start = today + dt.timedelta(days=1)
    forecast = [
        SalesForecastPoint(
            date=(forecast_start + dt.timedelta(days=i)).isoformat(),
            actual=None,
            predicted=round(value, 2),
        )
        for i, value in enumerate(predicted_values)
    ]

    return SalesForecastResponse(history=history, forecast=forecast)
