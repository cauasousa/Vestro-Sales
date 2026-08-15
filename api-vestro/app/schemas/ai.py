from pydantic import BaseModel


class AssistantRequest(BaseModel):
    prompt: str


class AssistantResponse(BaseModel):
    answer: str


class SummarizeFeedbackResponse(BaseModel):
    summary: str
