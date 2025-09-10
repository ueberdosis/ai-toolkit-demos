import asyncio
import os

from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()

# Initialize OpenAI client
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


openai_messages = [
    {
        "role": "user",
        "content": "What's the weather like in San Francisco? Please use the get_weather function.",
    }
]
system_message = "You are an assistant that can edit rich text documents."


def get_tool_definitions():
    """Simple tool definitions for testing"""
    return [
        {
            "type": "function",
            "name": "get_weather",
            "description": "Get the current weather for a location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "The city and state, e.g. San Francisco, CA",
                    }
                },
                "required": ["location"],
                "additionalProperties": False,
            },
            "strict": True,
        }
    ]


async def stream_chat_completion():
    stream = await client.responses.create(
        model="gpt-5-mini",
        instructions=system_message,
        input=openai_messages,
        tools=get_tool_definitions(),  # Enable tools for testing
        stream=True,
    )
    async for event in stream:
        event_type = getattr(event, "type", "")

        # Stream text deltas as they arrive
        if event_type == "response.output_text.delta":
            delta = getattr(event, "delta", "")
            if delta:
                yield {"type": "content", "content": delta}
            continue

        # Function call started - initial function call item
        elif event_type == "response.output_item.added":
            item = getattr(event, "item", None)
            output_index = getattr(event, "output_index", None)

            if item and getattr(item, "type", "") == "function_call":
                # Yield the initial function call
                yield {
                    "type": "tool_call_start",
                    "tool_call": {
                        "id": getattr(item, "id", ""),
                        "call_id": getattr(item, "call_id", ""),
                        "name": getattr(item, "name", ""),
                        "arguments": getattr(item, "arguments", ""),
                    },
                }
            continue

        # Function call arguments streaming
        elif event_type == "response.function_call_arguments.delta":
            output_index = getattr(event, "output_index", None)
            delta = getattr(event, "delta", "")

            yield {
                "type": "tool_call_delta",
                "output_index": output_index,
                "delta": delta,
            }
            continue

        # Function call arguments complete
        elif event_type == "response.function_call_arguments.done":
            output_index = getattr(event, "output_index", None)
            arguments = getattr(event, "arguments", "")

            yield {
                "type": "tool_call_arguments_done",
                "output_index": output_index,
                "arguments": arguments,
            }
            continue

        # Function call completely done
        elif event_type == "response.output_item.done":
            item = getattr(event, "item", None)
            output_index = getattr(event, "output_index", None)

            if item and getattr(item, "type", "") == "function_call":
                # Final complete tool call for frontend execution
                final_call = {
                    "id": getattr(item, "id", ""),
                    "call_id": getattr(item, "call_id", ""),
                    "name": getattr(item, "name", ""),
                    "arguments": getattr(item, "arguments", ""),
                }

                yield {"type": "tool_call", "tool_call": final_call}
            continue

        # Content part created/added events can be ignored for simple text streaming
        elif event_type in (
            "response.content_part.added",
            "response.output_text.added",
        ):
            continue

        # Completed: emit finish
        elif event_type == "response.completed":
            finish_reason = None
            if hasattr(event, "response") and hasattr(event.response, "finish_reason"):
                finish_reason = event.response.finish_reason
            yield {"type": "finish", "finish_reason": finish_reason or "stop"}
            return

        # Error event
        elif event_type == "response.error":
            # New SDK error event exposes .error with .message
            message = None
            if hasattr(event, "error") and hasattr(event.error, "message"):
                message = event.error.message
            yield {"type": "error", "error": message or str(event)}
            return


async def stream_and_collect():
    chunks = []
    async for chunk in stream_chat_completion():
        chunks.append(chunk)
        yield chunk


async def main():
    async for chunk in stream_and_collect():
        print(chunk)


if __name__ == "__main__":
    asyncio.run(main())
