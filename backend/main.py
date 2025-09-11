import logging
import os
from typing import Any

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ai_service import stream_chat_completion

# Load environment variables from .env file first
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler()  # This ensures logs go to console/terminal
    ],
)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Toolkit Chat API", version="1.0.0")

# Log startup
logger.info("🚀 Starting AI Toolkit Chat API...")

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models compatible with AI SDK
class MessagePart(BaseModel):
    type: str
    text: str = ""


class UIMessage(BaseModel):
    id: str
    role: str
    content: str = ""
    parts: list[MessagePart] = []


class ChatRequest(BaseModel):
    messages: list[dict[str, Any]]


@app.get("/")
async def root():
    return {"message": "AI Toolkit Chat API", "status": "running"}


@app.post("/api/chat")
async def chat_endpoint(request: Request):
    """
    Chat endpoint that replicates the TypeScript functionality
    """
    try:
        # Get raw body first for debugging
        body = await request.body()
        logger.info(f"Raw request body: {body.decode()}")

        # Parse JSON manually to see what we're getting
        import json

        data = json.loads(body.decode())
        logger.info(f"Parsed data keys: {data.keys()}")
        logger.info(f"Messages data: {data.get('messages', 'No messages key')}")

        # Try to parse with our model
        chat_request = ChatRequest(**data)
        logger.info(f"Successfully parsed {len(chat_request.messages)} messages")

        # Debug: Log message count only
        logger.info(f"Processing {len(chat_request.messages)} messages")

    except Exception as e:
        logger.error(f"Error parsing request: {e}")
        raise HTTPException(status_code=422, detail=f"Request parsing error: {str(e)}")

    try:
        messages = chat_request.messages

        # Check for OpenAI API key
        if not os.getenv("OPENAI_API_KEY"):
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")

        # Stream the AI response in Vercel AI SDK format
        async def generate_response():
            try:
                logger.info(f"Starting stream for {len(messages)} messages")
                async for chunk in stream_chat_completion(
                    messages=messages,
                    model="gpt-5-mini",  # Using gpt-5-mini for better performance
                    system_message="You are an assistant that can edit rich text documents.",
                ):
                    # chunk can be either a string (text delta) or a dict (tool call/error)
                    if isinstance(chunk, str):
                        # Stream raw text (frontend expects string payloads parsed from JSON)
                        logger.info(f"Sending chunk: {chunk}")
                        yield f"data: {json.dumps(chunk)}\n\n"
                    else:
                        # Log only important dict chunks
                        if chunk.get("type") in [
                            "tool-input-available",
                            "finish",
                            "error",
                        ]:
                            logger.info(f"Sending chunk: {chunk}")
                        yield f"data: {json.dumps(chunk)}\n\n"

                    # End the stream after finish
                    if not isinstance(chunk, str) and chunk.get("type") == "finish":
                        logger.info("Stream finished")
                        yield "data: [DONE]\n\n"
                        return

            except Exception as e:
                logger.error(f"Stream error: {str(e)}")
                error_chunk = {"type": "error", "error": f"AI service error: {str(e)}"}
                yield f"data: {json.dumps(error_chunk)}\n\n"

        return StreamingResponse(
            generate_response(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


if __name__ == "__main__":
    # Load environment variables
    load_dotenv()

    # Check if running in debug mode
    if os.getenv("DEBUG_MODE"):
        logger.info("🐛 Running in DEBUG mode")
        # Set logging to DEBUG level when debugging
        logging.getLogger().setLevel(logging.INFO)
        # When debugging, don't use reload and use a simpler setup
        uvicorn.run(app, host="127.0.0.1", port=8000, reload=False, log_level="debug")
    else:
        logger.info("🌍 Running in PRODUCTION/DEVELOPMENT mode")
        # Normal production/development mode
        uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
