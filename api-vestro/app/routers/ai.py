from typing import Annotated, Any

from fastapi import APIRouter, Depends

from app.auth import get_current_admin
from app.schemas import AssistantRequest, AssistantResponse, SummarizeFeedbackResponse
from app.services.assistant import get_assistant_answer
from app.services.feedback import summarize_feedback

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/assistant", response_model=AssistantResponse)
async def ai_assistant(
    body: AssistantRequest,
    _admin: Annotated[dict[str, Any], Depends(get_current_admin)],
) -> AssistantResponse:
    answer = await get_assistant_answer(body.prompt)
    return AssistantResponse(answer=answer)


@router.post("/summarize-feedback", response_model=SummarizeFeedbackResponse)
async def ai_summarize_feedback(
    _admin: Annotated[dict[str, Any], Depends(get_current_admin)],
) -> SummarizeFeedbackResponse:
    summary = await summarize_feedback()
    return SummarizeFeedbackResponse(summary=summary)
