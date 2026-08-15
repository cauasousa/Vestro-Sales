import datetime as dt
import re
from collections import Counter

from app.db import get_supabase, run_query

WINDOW_DAYS = 7
STOPWORDS = {
    "the", "a", "an", "is", "are", "to", "for", "and", "of", "in", "on",
    "i", "you", "it", "my", "your", "do", "does", "can", "will", "with",
    "this", "that", "have", "has", "was", "were", "be", "how", "what",
    "when", "where", "why", "about", "not", "just",
}


async def summarize_feedback() -> str:
    """Rule-based summary of recent chat_messages (no LLM configured)."""
    supabase = get_supabase()
    today = dt.datetime.now(dt.timezone.utc).date()
    start = today - dt.timedelta(days=WINDOW_DAYS - 1)

    result = await run_query(
        lambda: supabase.table("chat_messages")
        .select("conversation_id, sender, text, created_at")
        .gte("created_at", start.isoformat())
        .order("created_at")
        .execute()
    )
    rows = result.data or []

    if not rows:
        return f"No customer messages in the last {WINDOW_DAYS} days."

    # rows are ordered oldest-first, so the last write per conversation_id
    # here is that conversation's most recent sender in the window.
    last_sender_by_conversation: dict[str, str] = {}
    for row in rows:
        last_sender_by_conversation[row["conversation_id"]] = row["sender"]
    awaiting_reply = sum(1 for sender in last_sender_by_conversation.values() if sender == "customer")

    word_counts: Counter[str] = Counter()
    for row in rows:
        if row["sender"] != "customer":
            continue
        tokens = re.findall(r"[a-zA-Z']+", row["text"].lower())
        word_counts.update(token for token in tokens if token not in STOPWORDS and len(token) > 2)

    top_topics = [word for word, _ in word_counts.most_common(5)]
    topics_str = ", ".join(top_topics) if top_topics else "no recurring topics"

    return (
        f"{len(rows)} messages across {len(last_sender_by_conversation)} conversations in the last "
        f"{WINDOW_DAYS} days ({awaiting_reply} awaiting an admin reply). "
        f"Recurring customer topics: {topics_str}."
    )
