import datetime as dt

from app.db import get_supabase, run_query
from app.schemas import MetricsSummary

WINDOW_DAYS = 7


async def get_recent_activity() -> dict:
    supabase = get_supabase()
    today = dt.datetime.now(dt.timezone.utc).date()
    start = today - dt.timedelta(days=WINDOW_DAYS - 1)

    sales_result = await run_query(
        lambda: supabase.table("sales")
        .select("total_amount")
        .gte("created_at", start.isoformat())
        .execute()
    )
    sales_rows = sales_result.data or []
    revenue = sum(float(row["total_amount"]) for row in sales_rows)

    # `sales` has one row per order *item*, so counting those rows overstates
    # order volume for any multi-item order — count actual orders instead.
    orders_result = await run_query(
        lambda: supabase.table("orders")
        .select("id, customer_id")
        .gte("created_at", start.isoformat())
        .execute()
    )
    order_rows = orders_result.data or []
    distinct_buyers = {row["customer_id"] for row in order_rows if row.get("customer_id")}

    profiles_result = await run_query(
        lambda: supabase.table("profiles")
        .select("id", count="exact")
        .gte("created_at", start.isoformat())
        .execute()
    )

    return {
        "revenue": revenue,
        "orders_count": len(order_rows),
        "distinct_buyers": len(distinct_buyers),
        "new_customers": profiles_result.count or 0,
    }


async def get_metrics_summary() -> MetricsSummary:
    supabase = get_supabase()
    activity = await get_recent_activity()

    users_result = await run_query(
        lambda: supabase.table("profiles").select("id", count="exact").execute()
    )
    total_users = users_result.count or 0

    # Share of the user base that actually bought something this window.
    # Bounded at 100% by construction (distinct buyers is a subset of
    # total_users) — orders_count alone isn't, since one customer can place
    # several orders and used to push this past 100%.
    conversion_rate = (
        round(activity["distinct_buyers"] / total_users * 100, 2) if total_users else 0.0
    )

    return MetricsSummary(
        revenue=round(activity["revenue"], 2),
        newCustomers=activity["new_customers"],
        conversionRate=conversion_rate,
        ordersCount=activity["orders_count"],
        totalUsers=total_users,
    )
