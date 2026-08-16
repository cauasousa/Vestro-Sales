import asyncio
from functools import lru_cache

from google import genai
from google.genai import types

from app.config import get_settings
from app.db import get_supabase, run_query
from app.services.metrics import WINDOW_DAYS, get_recent_activity

LOW_STOCK_THRESHOLD = 5

SYSTEM_INSTRUCTION = (
    "You are the admin-facing AI assistant for Vestro, a small e-commerce store. "
    "Answer the admin's question using ONLY the store data given to you — never invent "
    "numbers. If the data doesn't cover what's asked, say so plainly instead of guessing. "
    "Keep answers to 1-3 sentences, plain text, no markdown."
)


@lru_cache
def _client() -> genai.Client | None:
    """None when GEMINI_API_KEY isn't set — callers fall back to the keyword-matched
    answer instead of erroring, same degrade-gracefully pattern as forecaster.load_model()."""
    api_key = get_settings().gemini_api_key
    if not api_key:
        return None
    return genai.Client(api_key=api_key)


async def _top_product() -> str | None:
    supabase = get_supabase()
    sales_result = await run_query(
        lambda: supabase.table("sales").select("product_id, quantity").execute()
    )
    products_result = await run_query(
        lambda: supabase.table("products").select("id, name, category").execute()
    )
    products_by_id = {p["id"]: p for p in (products_result.data or [])}

    totals: dict[str, int] = {}
    for row in sales_result.data or []:
        product_id = row.get("product_id")
        if product_id:
            totals[product_id] = totals.get(product_id, 0) + int(row["quantity"])

    if not totals:
        return None

    top_id = max(totals, key=totals.get)
    product = products_by_id.get(top_id)
    if not product:
        return None
    return f'"{product["name"]}" ({product["category"]}) with {totals[top_id]} units sold'


async def _low_stock_products() -> list[dict]:
    supabase = get_supabase()
    result = await run_query(
        lambda: supabase.table("products")
        .select("name, stock")
        .lte("stock", LOW_STOCK_THRESHOLD)
        .eq("is_active", True)
        .execute()
    )
    return result.data or []


async def _build_context() -> str:
    """Snapshots the same live Supabase figures the old keyword-matched assistant used,
    as plain text — grounds every Gemini answer in real numbers instead of letting the
    model guess at business data it was never given."""
    from app.services.forecast import get_sales_forecast

    activity = await get_recent_activity()
    forecast = await get_sales_forecast()
    top = await _top_product()
    low_stock = await _low_stock_products()

    next_point = forecast.forecast[0] if forecast.forecast else None
    forecast_line = (
        f"Forecast for {next_point.date}: ${next_point.predicted:.2f}."
        if next_point and next_point.predicted is not None
        else "No forecast available yet."
    )
    low_stock_line = (
        ", ".join(f"{p['name']} ({p['stock']} left)" for p in low_stock) if low_stock else "none"
    )

    return (
        f"Last {WINDOW_DAYS} days: ${activity['revenue']:.2f} revenue, "
        f"{activity['orders_count']} orders, {activity['new_customers']} new customers.\n"
        f"{forecast_line}\n"
        f"Top-selling product: {top or 'no sales recorded yet'}.\n"
        f"Low stock (<= {LOW_STOCK_THRESHOLD} units): {low_stock_line}."
    )


GEMINI_TIMEOUT_SECONDS = 20


async def get_assistant_answer(prompt: str) -> str:
    client = _client()
    if client is None:
        return await _keyword_answer(prompt)

    context = await _build_context()
    try:
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=get_settings().gemini_model,
                contents=f"Store data:\n{context}\n\nAdmin question: {prompt}",
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    temperature=0.2,
                ),
            ),
            timeout=GEMINI_TIMEOUT_SECONDS,
        )
    except (Exception, asyncio.TimeoutError):
        # Bad key, quota, network blip, transient Gemini outage (observed: occasional
        # multi-second hangs and 503 "high demand" errors even with a valid key/model),
        # etc. — don't hang or 500 the admin's assistant over it.
        return await _keyword_answer(prompt)

    return (response.text or "").strip() or await _keyword_answer(prompt)


async def _keyword_answer(prompt: str) -> str:
    """Fallback used when GEMINI_API_KEY isn't configured or the Gemini call fails."""
    q = prompt.lower()

    if "revenue" in q or "sales" in q:
        activity = await get_recent_activity()
        return (
            f"Revenue over the last {WINDOW_DAYS} days was ${activity['revenue']:.2f}, "
            f"across {activity['orders_count']} orders."
        )

    if "forecast" in q or "predict" in q:
        from app.services.forecast import get_sales_forecast

        forecast = await get_sales_forecast()
        next_point = forecast.forecast[0] if forecast.forecast else None
        if next_point and next_point.predicted is not None:
            return f"The forecast for {next_point.date} is ${next_point.predicted:.2f}."
        return "I don't have a forecast for that period yet."

    if "top product" in q or "best seller" in q or "best-selling" in q:
        top = await _top_product()
        return f"Your top-selling product is {top}." if top else "No sales recorded yet to determine a top product."

    if "customer" in q or "client" in q:
        activity = await get_recent_activity()
        return f"You've gained {activity['new_customers']} new customers in the last {WINDOW_DAYS} days."

    if "stock" in q or "inventory" in q or "out of stock" in q:
        low = await _low_stock_products()
        if low:
            items = ", ".join(f"{p['name']} ({p['stock']} left)" for p in low)
            return f"Low on stock: {items}."
        return "All products are well stocked right now."

    return (
        "I can answer questions about revenue, forecasts, top products, customers, "
        "and stock levels — try asking about one of those."
    )
