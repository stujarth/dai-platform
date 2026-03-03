import json

from fastapi import APIRouter, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.dependencies import get_ai_service, get_duckdb
from app.models.chat import ChatRequest, ChatSuggestion
from app.services.ai_service import AIService
from app.services.duckdb_service import DuckDBService

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/message")
async def chat_message(
    request: ChatRequest,
    ai_service: AIService = Depends(get_ai_service),
) -> EventSourceResponse:
    """Streaming SSE endpoint for AI chat.

    Sends server-sent events with the following event types:
      - text: A chunk of assistant text
      - tool_call: A tool invocation (name + input)
      - tool_result: The result of a tool call
      - error: An error message
      - done: End of stream
    """
    history = [{"role": msg.role, "content": msg.content} for msg in request.conversation_history]

    async def event_generator():
        try:
            async for chunk in ai_service.chat_stream(
                message=request.message,
                history=history,
                context=request.context,
            ):
                event_type = chunk.get("type", "text")
                yield {
                    "event": event_type,
                    "data": json.dumps(chunk, default=str),
                }
        except Exception as e:
            yield {
                "event": "error",
                "data": json.dumps({"type": "error", "content": str(e)}),
            }
            yield {
                "event": "done",
                "data": json.dumps({"type": "done"}),
            }

    return EventSourceResponse(event_generator())


@router.post("/suggestions", response_model=list[ChatSuggestion])
async def get_suggestions(
    request: ChatRequest,
    ai_service: AIService = Depends(get_ai_service),
) -> list[ChatSuggestion]:
    """Get contextual quick-action suggestions based on the current wizard step."""
    try:
        raw = ai_service.get_suggestions(request.context)
        return [
            ChatSuggestion(text=s["text"], category=s.get("category", "general"))
            for s in raw
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get suggestions: {str(e)}")
