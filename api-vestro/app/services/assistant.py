from app.db import get_supabase, run_query
from app.services.metrics import WINDOW_DAYS, get_recent_activity

LOW_STOCK_THRESHOLD = 5


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


async def get_assistant_answer(prompt: str) -> str:
    """Keyword-matched answers over live Supabase data (no LLM configured)."""
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
