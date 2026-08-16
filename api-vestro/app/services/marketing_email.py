import resend

from app.config import get_settings
from app.db import get_supabase, run_query
from app.schemas import MarketingEmailRequest, MarketingEmailResponse

RESEND_BATCH_LIMIT = 100


async def get_opted_in_emails() -> list[str]:
    supabase = get_supabase()
    try:
        result = await run_query(
            lambda: supabase.table("profiles").select("email").eq("accepts_marketing", True).execute()
        )
    except Exception:
        # `profiles.accepts_marketing` doesn't exist yet until the schema migration
        # (docs/migration_marketing_email.sql) has been run.
        return []
    return [row["email"] for row in (result.data or []) if row.get("email")]


def _to_html(body: str) -> str:
    """Turns plain-text admin input into minimal HTML paragraphs — the compose
    form is a plain textarea, not a rich-text editor, on purpose (kept simple)."""
    paragraphs = [p for p in body.strip().split("\n\n") if p]
    return "".join(f"<p>{p.replace(chr(10), '<br>')}</p>" for p in paragraphs)


async def send_marketing_email(payload: MarketingEmailRequest) -> MarketingEmailResponse:
    settings = get_settings()
    if not settings.resend_api_key:
        raise ValueError("RESEND_API_KEY is not configured")

    if payload.recipientMode == "opted_in":
        recipients = await get_opted_in_emails()
    else:
        recipients = list(dict.fromkeys(payload.manualEmails))  # de-dupe, keep order

    if not recipients:
        return MarketingEmailResponse(recipientCount=0, sentCount=0, failedEmails=[])

    resend.api_key = settings.resend_api_key
    html = _to_html(payload.body)
    failed: list[str] = []
    sent = 0

    # Resend batch caps at 100 emails per call, and each entry is its own
    # discrete send (its own `to`) — recipients never see each other's address.
    for i in range(0, len(recipients), RESEND_BATCH_LIMIT):
        chunk = recipients[i : i + RESEND_BATCH_LIMIT]
        params = [
            {"from": settings.resend_from_email, "to": [email], "subject": payload.subject, "html": html}
            for email in chunk
        ]
        try:
            await run_query(lambda p=params: resend.Batch.send(p))
            sent += len(chunk)
        except Exception:
            failed.extend(chunk)

    return MarketingEmailResponse(recipientCount=len(recipients), sentCount=sent, failedEmails=failed)
