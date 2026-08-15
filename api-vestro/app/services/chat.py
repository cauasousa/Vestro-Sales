from fastapi import HTTPException, status

from app.db import get_supabase, run_maybe_single, run_query
from app.schemas import ChatMessage, Conversation


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
    result = await run_query(
        lambda: supabase.table("chat_messages")
        .select("id, sender, text, created_at")
        .eq("conversation_id", conversation_id)
        .order("created_at")
        .execute()
    )
    return [
        ChatMessage(id=row["id"], from_=row["sender"], text=row["text"], createdAt=row["created_at"])
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


async def list_conversations() -> list[Conversation]:
    supabase = get_supabase()
    result = await run_query(
        lambda: supabase.table("conversations").select("id, customer_id, customer_name").execute()
    )

    conversations = []
    for row in result.data or []:
        messages = await _messages_for(row["id"])
        conversations.append(
            Conversation(
                customerId=row["customer_id"], customerName=row["customer_name"], messages=messages
            )
        )
    return conversations


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
    return Conversation(
        customerId=customer_id, customerName=conversation["customer_name"], messages=messages
    )


async def add_message(customer_id: str, text: str, sender: str) -> Conversation:
    supabase = get_supabase()
    conversation = await _get_or_create_conversation(customer_id)
    await run_query(
        lambda: supabase.table("chat_messages")
        .insert({"conversation_id": conversation["id"], "sender": sender, "text": text})
        .execute()
    )
    messages = await _messages_for(conversation["id"])
    return Conversation(
        customerId=customer_id, customerName=conversation["customer_name"], messages=messages
    )
