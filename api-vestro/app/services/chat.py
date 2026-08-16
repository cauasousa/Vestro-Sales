from fastapi import HTTPException, status

from app.db import get_supabase, run_maybe_single, run_query
from app.schemas import ChatMessage, ChatReport, Conversation


async def _profile_name(customer_id: str) -> str:
    supabase = get_supabase()
    profile = await run_maybe_single(
        lambda: supabase.table("profiles")
        .select("full_name, email")
        .eq("id", customer_id)
        .maybe_single()
        .execute()
    ) or {}
    return profile.get("full_name") or profile.get("email") or customer_id


async def _messages_for(conversation_id: str) -> list[ChatMessage]:
    supabase = get_supabase()
    try:
        result = await run_query(
            lambda: supabase.table("chat_messages")
            .select("id, sender, text, order_id, created_at")
            .eq("conversation_id", conversation_id)
            .order("created_at")
            .execute()
        )
    except Exception:
        # `chat_messages.order_id` doesn't exist yet until the schema migration
        # (docs/migration_chat_order_link.sql) has been run — fall back to the
        # pre-order-link column set instead of breaking chat.
        result = await run_query(
            lambda: supabase.table("chat_messages")
            .select("id, sender, text, created_at")
            .eq("conversation_id", conversation_id)
            .order("created_at")
            .execute()
        )
    return [
        ChatMessage(
            id=row["id"],
            from_=row["sender"],
            text=row["text"],
            orderId=row.get("order_id"),
            createdAt=row["created_at"],
        )
        for row in (result.data or [])
    ]


async def _get_or_create_conversation(customer_id: str) -> dict:
    supabase = get_supabase()
    existing = await run_maybe_single(
        lambda: supabase.table("conversations")
        .select("id, customer_name")
        .eq("customer_id", customer_id)
        .maybe_single()
        .execute()
    )
    if existing:
        return existing

    # conversations.customer_id is a FK into profiles — validate it exists
    # up front, otherwise the insert below fails with a raw FK violation.
    profile = await run_maybe_single(
        lambda: supabase.table("profiles")
        .select("full_name, email")
        .eq("id", customer_id)
        .maybe_single()
        .execute()
    )
    if not profile:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Customer not found")

    customer_name = profile.get("full_name") or profile.get("email") or customer_id
    insert_result = await run_query(
        lambda: supabase.table("conversations")
        .insert({"customer_id": customer_id, "customer_name": customer_name})
        .execute()
    )
    return insert_result.data[0]


async def _reported_conversation_ids() -> set[str]:
    supabase = get_supabase()
    try:
        result = await run_query(lambda: supabase.table("chat_reports").select("conversation_id").execute())
    except Exception:
        # `chat_reports` doesn't exist yet until the schema SQL (docs/database-schema.md
        # §2) has been run — degrade to "nothing reported" instead of breaking chat.
        return set()
    return {row["conversation_id"] for row in (result.data or [])}


async def list_conversations() -> list[Conversation]:
    supabase = get_supabase()
    result = await run_query(
        lambda: supabase.table("conversations").select("id, customer_id, customer_name, created_at").execute()
    )
    reported_ids = await _reported_conversation_ids()

    conversations = []
    for row in result.data or []:
        messages = await _messages_for(row["id"])
        conversations.append(
            (
                messages[-1].createdAt if messages else row["created_at"],
                Conversation(
                    id=row["id"],
                    customerId=row["customer_id"],
                    customerName=row["customer_name"],
                    messages=messages,
                    reported=row["id"] in reported_ids,
                ),
            )
        )
    # Most recent activity first — a new message (or a brand-new empty conversation)
    # should surface at the top of the admin's inbox, not wherever Postgres happens
    # to return the row.
    conversations.sort(key=lambda pair: pair[0], reverse=True)
    return [conversation for _, conversation in conversations]


async def get_conversation(customer_id: str) -> Conversation:
    supabase = get_supabase()
    conversation = await run_maybe_single(
        lambda: supabase.table("conversations")
        .select("id, customer_name")
        .eq("customer_id", customer_id)
        .maybe_single()
        .execute()
    )
    if not conversation:
        customer_name = await _profile_name(customer_id)
        return Conversation(customerId=customer_id, customerName=customer_name, messages=[])

    messages = await _messages_for(conversation["id"])
    reported_ids = await _reported_conversation_ids()
    return Conversation(
        id=conversation["id"],
        customerId=customer_id,
        customerName=conversation["customer_name"],
        messages=messages,
        reported=conversation["id"] in reported_ids,
    )


async def add_message(customer_id: str, text: str, sender: str, order_id: str | None = None) -> Conversation:
    supabase = get_supabase()
    conversation = await _get_or_create_conversation(customer_id)
    row = {"conversation_id": conversation["id"], "sender": sender, "text": text, "order_id": order_id}
    try:
        await run_query(lambda: supabase.table("chat_messages").insert(row).execute())
    except Exception:
        # Same fallback as _messages_for — column not migrated yet.
        legacy_row = {k: v for k, v in row.items() if k != "order_id"}
        await run_query(lambda: supabase.table("chat_messages").insert(legacy_row).execute())
    messages = await _messages_for(conversation["id"])
    reported_ids = await _reported_conversation_ids()
    return Conversation(
        id=conversation["id"],
        customerId=customer_id,
        customerName=conversation["customer_name"],
        messages=messages,
        reported=conversation["id"] in reported_ids,
    )


async def report_conversation(customer_id: str, reason: str | None) -> ChatReport:
    supabase = get_supabase()
    conversation = await _get_or_create_conversation(customer_id)
    result = await run_query(
        lambda: supabase.table("chat_reports")
        .insert({"conversation_id": conversation["id"], "reason": reason})
        .execute()
    )
    row = result.data[0]
    return ChatReport(id=row["id"], conversationId=row["conversation_id"], reason=row.get("reason"), createdAt=row["created_at"])
