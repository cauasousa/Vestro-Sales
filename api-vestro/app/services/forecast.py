import datetime as dt

from fastapi import HTTPException, status

from app.db import get_supabase, run_query
from app.ml import forecaster
from app.ml.train import train as train_model
from app.schemas import (
    SalesForecastPoint,
    SalesForecastResponse,
    SalesMLForecastResponse,
    SalesRetrainResponse,
)

HISTORY_DAYS = 7
FORECAST_DAYS = 7
CONTEXT_HISTORY_DAYS = 14


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


async def get_ml_forecast() -> SalesMLForecastResponse:
    """LightGBM-based forecast for the next `FORECAST_DAYS` days, informed by calendar
    context (payday, holidays, promos).

    Each day's prediction feeds back into the next day's `rolling_mean_7d` feature, so the
    horizon is walked forward one day at a time rather than predicted in a single batch.
    Degrades to `model_available: false` (empty forecast) when the model hasn't been
    trained yet — see docs/machine-learning.md for what's needed to enable this.
    """
    model = forecaster.load_model()
    if model is None:
        return SalesMLForecastResponse(forecast=[], model_available=False)

    supabase = get_supabase()
    today = dt.datetime.now(dt.timezone.utc).date()

    history_start = today - dt.timedelta(days=CONTEXT_HISTORY_DAYS - 1)
    sales_result = await run_query(
        lambda: supabase.table("sales")
        .select("total_amount, created_at")
        .gte("created_at", history_start.isoformat())
        .execute()
    )
    historical_sales = _daily_totals(sales_result.data or [], history_start, CONTEXT_HISTORY_DAYS)

    forecast_start = today + dt.timedelta(days=1)
    target_dates = [forecast_start + dt.timedelta(days=i) for i in range(FORECAST_DAYS)]

    try:
        context_result = await run_query(
            lambda: supabase.table("calendar_context")
            .select("*")
            .gte("date", target_dates[0].isoformat())
            .lte("date", target_dates[-1].isoformat())
            .execute()
        )
        context_by_date = {row["date"]: row for row in (context_result.data or [])}
    except Exception:
        # `calendar_context` doesn't exist yet — see docs/machine-learning.md.
        context_by_date = {}

    points = []
    for target_date in target_dates:
        context_data = context_by_date.get(target_date.isoformat(), {})
        predicted = forecaster.predict_next_day(model, target_date, historical_sales, context_data)
        historical_sales[target_date] = predicted  # feeds the next day's rolling mean
        points.append(
            SalesForecastPoint(date=target_date.isoformat(), actual=None, predicted=round(predicted, 2))
        )

    return SalesMLForecastResponse(forecast=points, model_available=True)


async def retrain_model(holdout_days: int = 14) -> SalesRetrainResponse:
    """Re-fits the LightGBM model against current `sales` + `calendar_context` data and
    overwrites the saved `.pkl`. Unlike running `python -m app.ml.train` from a shell, this
    also clears `forecaster.load_model`'s cache, so the very next `/forecast-ml` call in
    this same process picks up the freshly trained model without a restart.
    """
    try:
        result = await run_query(lambda: train_model(holdout_days))
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc

    forecaster.load_model.cache_clear()
    return SalesRetrainResponse(
        trained_days=result.trained_days,
        holdout_days=result.holdout_days,
        holdout_mae=result.holdout_mae,
        model_path=result.model_path,
    )
