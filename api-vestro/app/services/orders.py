from typing import Any

from supabase import Client

from app.db import get_supabase, run_maybe_single, run_query
from app.schemas import CartItem, Order, OrderCreateRequest, OrderCustomer


def _row_to_order(order_row: dict[str, Any], item_rows: list[dict[str, Any]]) -> Order:
    return Order(
        id=order_row["id"],
        customerId=order_row.get("customer_id"),
        items=[
            CartItem(
                productId=row["product_id"],
                name=row["name"],
                price=row["price"],
                image_url=row.get("image_url"),
                stock=row["quantity"],
                quantity=row["quantity"],
            )
            for row in item_rows
        ],
        subtotal=order_row["subtotal"],
        status=order_row.get("status", "placed"),
        customer=OrderCustomer(
            fullName=order_row["full_name"],
            email=order_row["email"],
            address=order_row["address"],
            city=order_row["city"],
            postalCode=order_row["postal_code"],
        ),
        createdAt=order_row["created_at"],
    )


async def _fetch_items(supabase: Client, order_id: str) -> list[dict[str, Any]]:
    result = await run_query(
        lambda: supabase.table("order_items")
        .select("product_id, name, price, quantity, image_url")
        .eq("order_id", order_id)
        .execute()
    )
    return result.data or []


async def create_order(payload: OrderCreateRequest, customer_id: str | None) -> Order:
    supabase = get_supabase()
    subtotal = round(sum(item.price * item.quantity for item in payload.items), 2)

    order_result = await run_query(
        lambda: supabase.table("orders")
        .insert(
            {
                "customer_id": customer_id,
                "full_name": payload.customer.fullName,
                "email": payload.customer.email,
                "address": payload.customer.address,
                "city": payload.customer.city,
                "postal_code": payload.customer.postalCode,
                "subtotal": subtotal,
            }
        )
        .execute()
    )
    order_row = order_result.data[0]

    item_rows = [
        {
            "order_id": order_row["id"],
            "product_id": item.productId,
            "name": item.name,
            "price": item.price,
            "quantity": item.quantity,
            "image_url": item.image_url,
        }
        for item in payload.items
    ]
    # `sales` rows are populated automatically by the record_sale_from_order_item
    # trigger on insert — inserting them here too would double-count revenue.
    await run_query(lambda: supabase.table("order_items").insert(item_rows).execute())

    return _row_to_order(order_row, item_rows)


async def get_order_with_owner(order_id: str) -> tuple[Order, str | None] | None:
    supabase = get_supabase()
    order_row = await run_maybe_single(
        lambda: supabase.table("orders").select("*").eq("id", order_id).maybe_single().execute()
    )
    if not order_row:
        return None

    item_rows = await _fetch_items(supabase, order_id)
    return _row_to_order(order_row, item_rows), order_row.get("customer_id")


async def list_orders_for_customer(customer_id: str) -> list[Order]:
    supabase = get_supabase()
    orders_result = await run_query(
        lambda: supabase.table("orders")
        .select("*")
        .eq("customer_id", customer_id)
        .order("created_at", desc=True)
        .execute()
    )
    return await _rows_to_orders(supabase, orders_result.data or [])


async def list_all_orders() -> list[Order]:
    """Admin-only: every order, including guest checkouts (customer_id null)."""
    supabase = get_supabase()
    orders_result = await run_query(
        lambda: supabase.table("orders").select("*").order("created_at", desc=True).execute()
    )
    return await _rows_to_orders(supabase, orders_result.data or [])


async def _rows_to_orders(supabase: Client, order_rows: list[dict[str, Any]]) -> list[Order]:
    orders = []
    for order_row in order_rows:
        item_rows = await _fetch_items(supabase, order_row["id"])
        orders.append(_row_to_order(order_row, item_rows))
    return orders
