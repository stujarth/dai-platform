from pydantic import BaseModel
from typing import Any


class ChatMessage(BaseModel):
    role: str  # user, assistant
    content: str


class ChatRequest(BaseModel):
    message: str
    conversation_history: list[ChatMessage] = []
    context: dict[str, Any] = {}


class ChatSuggestion(BaseModel):
    text: str
    category: str = "general"
