import os
from typing import Any

from dotenv import load_dotenv
from openai import AsyncOpenAI
from rich import print

# Load environment variables from .env file
load_dotenv()

# Initialize OpenAI client
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def convert_to_openai_input(ui_messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Convert UI messages to OpenAI responses API input format
    """
    input_list = []

    for msg in ui_messages:
        role = msg.get("role", "")

        if role == "user":
            # Build content from either content field or parts
            content = msg.get("content", "")
            if not content and "parts" in msg:
                text_parts = []
                for part in msg["parts"]:
                    if part.get("type") == "text":
                        text_parts.append(part.get("text", ""))
                content = "".join(text_parts)

            if content:
                input_list.append({"role": "user", "content": content})

        elif role == "assistant":
            # Handle assistant messages with tool calls and results
            text_content = msg.get("content", "")
            parts = msg.get("parts", [])

            if not text_content and parts:
                text_parts = []
                for part in parts:
                    if part.get("type") == "text":
                        text_parts.append(part.get("text", ""))
                text_content = "".join(text_parts)

            # Extract function calls and tool results from parts
            function_calls = []
            tool_results = []

            print(f"Assistant message has {len(parts)} parts:")
            for i, part in enumerate(parts):
                part_type = part.get("type", "")

                print(f"  Part {i}: type='{part_type}'")

                # Handle function_call objects (GPT-5 emits these)
                if part_type == "function_call":
                    call_id = part.get("call_id", "")
                    name = part.get("name", "")
                    arguments = part.get("arguments", "")

                    if call_id and name:
                        print(f"    -> Adding function call: {name} ({call_id})")
                        function_calls.append(
                            {
                                "type": "function_call",
                                "call_id": call_id,
                                "name": name,
                                "arguments": arguments,
                                "id": f"fc_{call_id.replace('call_', '')}"
                                if call_id.startswith("call_")
                                else f"fc_{call_id}",
                            }
                        )

                # Handle function_call_output objects
                elif part_type == "function_call_output":
                    call_id = part.get("call_id", "")
                    output = part.get("output", "")

                    if call_id and output:
                        print(f"    -> Adding function call output for {call_id}")
                        tool_results.append(
                            {
                                "type": "function_call_output",
                                "call_id": call_id,
                                "output": output,
                            }
                        )

                # Legacy support: Handle tool results from Vercel AI SDK format
                elif part_type.startswith("tool-"):
                    tool_call_id = part.get("toolCallId", "")
                    output = part.get("output", "")

                    if tool_call_id and output:
                        print(f"    -> Adding legacy tool result for {tool_call_id}")
                        tool_results.append(
                            {
                                "type": "function_call_output",
                                "call_id": tool_call_id,
                                "output": output,
                            }
                        )

            # Add content in the correct order for GPT-5:
            # 1. First add any text content
            if text_content:
                input_list.append({"role": "assistant", "content": text_content})

            # 2. Then add function calls (these come from GPT-5's output)
            for function_call in function_calls:
                input_list.append(function_call)

            # 3. Finally add tool results (these come after execution)
            for tool_result in tool_results:
                input_list.append(tool_result)

        elif role == "system":
            content = msg.get("content", "")
            if not content and "parts" in msg:
                text_parts = []
                for part in msg["parts"]:
                    if part.get("type") == "text":
                        text_parts.append(part.get("text", ""))
                content = "".join(text_parts)

            if content:
                input_list.append({"role": "system", "content": content})

    # Count function calls and tool results
    total_function_calls = sum(
        1
        for item in input_list
        if isinstance(item, dict) and item.get("type") == "function_call"
    )
    total_tool_results = sum(
        1
        for item in input_list
        if isinstance(item, dict) and item.get("type") == "function_call_output"
    )

    if total_function_calls > 0 or total_tool_results > 0:
        print(
            f"Extracted {total_function_calls} function calls and {total_tool_results} tool results from messages"
        )

    return input_list


def get_tool_definitions() -> list[dict[str, Any]]:
    """
    Get the actual TipTap AI Toolkit tool definitions.
    These are extracted directly from @tiptap-pro/ai-toolkit-ai-sdk.

    Tools will be executed on the frontend by TipTap, not the backend.
    """
    return [
        {
            "type": "function",
            "name": "insertContent",
            "description": """Inserts HTML content at one of these positions:
                - 'document': Replace the entire document with HTML content.
                - 'documentStart': Insert HTML content at the start of the document.
                - 'documentEnd': Insert HTML content at the end of the document.
                - 'selection': Replace the editor selection with HTML content.
                - 'selectionStart': Insert HTML content before the editor selection.
                - 'selectionEnd': Insert HTML content after the editor selection.

                IMPORTANT RULES
                - Before you call a tool that edits the document like applyDiff and insertContent, make sure you read the document first and you understand it very well.
                - Before calling insertContent with position selection/selectionStart/selectionEnd, read the editor selection first with the readSelection tool.
                - ALWAYS use the applyDiff tool to make edits to the document instead of insertContent, except when you are absolutely sure that you need to insert content at these positions: document/documentStart/documentEnd/selection/selectionStart/selectionEnd.""",
            "parameters": {
                "type": "object",
                "properties": {
                    "html": {
                        "type": "string",
                        "description": "The HTML content to insert",
                    },
                    "position": {
                        "type": "string",
                        "enum": [
                            "selection",
                            "selectionStart",
                            "selectionEnd",
                            "document",
                            "documentStart",
                            "documentEnd",
                        ],
                        "description": "Position where to insert the content",
                    },
                },
                "required": ["html", "position"],
                "additionalProperties": False,
            },
            "strict": True,
        },
        {
            "type": "function",
            "name": "applyDiff",
            "description": """Apply a list of diffs to the HTML code of the current chunk. Each diff contains:
                - "delete": replaced code. Must be an EXACT match.
                - "insert": inserted code (an empty string if the diff is a deletion)
                - "context": The 10 characters before the "delete" code, or an empty string if the diff is at the beginning of the document.

                For example, if the HTML code is "<p>This is a paragraph</p><p>This is another paragraph</p>" and you want to replace the second "paragraph" with "<b>paragraph</b>", you would use:
                - "delete": "paragraph"
                - "insert": "<b>paragraph</b>"
                - "context": "<p>This is another" <-- Contains the 10 characters before "paragraph"

                To replace the first "paragraph" with "section":
                - "delete": "paragraph"
                - "insert": "section"
                - "context": "<p>This is a " <-- The 10 characters before "paragraph"

                If the diff starts at the beginning of the document:
                - "delete": "<p>This"
                - "insert": "<p>That"
                - "context": "" <-- Empty string, because there is no text before

                The "context" should be short (10 characters), but if the "delete" text is repeated so many times in the HTML code such that a short "context" string is not enough to uniquely identify the position where the diff should be applied, you can make "context" very long to include more characters from the previous code so that there is no ambiguity.

                IMPORTANT: do not, under any circumstance, make the "context" include the "delete" text. The "context" is only used to disambiguate the position of the diff, it is not used to find the "delete" text.

                The diffs will be applied in sequence, one after the other, from top to bottom.""",
            "parameters": {
                "type": "object",
                "properties": {
                    "diffs": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "context": {
                                    "type": "string",
                                    "description": "The 10 characters before the delete text",
                                },
                                "delete": {
                                    "type": "string",
                                    "description": "The text to be replaced (exact match required)",
                                },
                                "insert": {
                                    "type": "string",
                                    "description": "The new text to insert",
                                },
                            },
                            "required": ["context", "delete", "insert"],
                            "additionalProperties": False,
                        },
                    }
                },
                "required": ["diffs"],
                "additionalProperties": False,
            },
            "strict": True,
        },
        {
            "type": "function",
            "name": "readFirstChunk",
            "description": "You read the current document in chunks, not all at once. When you read a chunk, you'll be informed of the total number of chunks in the current document, the index of the current chunk (zero-based) and the content of the chunk (between triple quotes). The readFirstChunk tool reads the first chunk of the document.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
                "additionalProperties": False,
            },
            "strict": True,
        },
        {
            "type": "function",
            "name": "readNextChunk",
            "description": "Read the next chunk of the document.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
                "additionalProperties": False,
            },
            "strict": True,
        },
        {
            "type": "function",
            "name": "readPreviousChunk",
            "description": "Read the previous chunk of the document.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
                "additionalProperties": False,
            },
            "strict": True,
        },
        {
            "type": "function",
            "name": "readSelection",
            "description": "Read the editor selection. Get the selected content (in HTML format) and the index of the chunk where the editor selection starts.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
                "additionalProperties": False,
            },
            "strict": True,
        },
    ]


async def stream_chat_completion(
    messages: list[dict[str, Any]],
    model: str = "gpt-5-mini",
    system_message: str = "You are an assistant that can edit rich text documents.",
    temperature: float = 0.7,
):
    """
    Stream chat completion with tool support using GPT-5 streaming responses API
    """
    # Convert UI messages to OpenAI input format
    openai_input = convert_to_openai_input(messages)

    # Debug print to see what we're sending to OpenAI
    print("OpenAI input being sent:")
    print(openai_input)

    try:
        stream = await client.responses.create(
            model=model,
            instructions=system_message,
            input=openai_input,
            tools=get_tool_definitions(),  # Enable tools
            stream=True,
        )
        print("Using Responses API with tool support")

        # Track function calls being built
        function_calls = {}

        async for event in stream:
            event_type = getattr(event, "type", "")

            # Stream text deltas as they arrive
            if event_type == "response.output_text.delta":
                delta = getattr(event, "delta", "")
                if delta:
                    # Vercel AI SDK expects text deltas in this format
                    yield {"type": "text-delta", "textDelta": delta}
                continue
            # Function call started - initial function call item
            elif event_type == "response.output_item.added":
                item = getattr(event, "item", None)
                output_index = getattr(event, "output_index", None)

                if item and getattr(item, "type", "") == "function_call":
                    # Initialize function call tracking
                    function_calls[output_index] = {
                        "id": getattr(item, "id", ""),
                        "call_id": getattr(item, "call_id", ""),
                        "name": getattr(item, "name", ""),
                        "arguments": getattr(item, "arguments", ""),
                    }
                    # Vercel AI SDK format for tool input start
                    yield {
                        "type": "tool-input-start",
                        "toolCallId": function_calls[output_index]["call_id"],
                        "toolName": function_calls[output_index]["name"],
                    }
                continue

            # Function call arguments streaming
            elif event_type == "response.function_call_arguments.delta":
                output_index = getattr(event, "output_index", None)
                delta = getattr(event, "delta", "")

                if output_index in function_calls:
                    # Update arguments with delta
                    function_calls[output_index]["arguments"] += delta

                    # Vercel AI SDK format for tool input delta
                    yield {
                        "type": "tool-input-delta",
                        "toolCallId": function_calls[output_index]["call_id"],
                        "inputTextDelta": delta,
                    }
                continue

            # Function call arguments complete
            elif event_type == "response.function_call_arguments.done":
                output_index = getattr(event, "output_index", None)
                arguments = getattr(event, "arguments", "")

                if output_index in function_calls:
                    # Update with final arguments
                    function_calls[output_index]["arguments"] = arguments

                    # Parse arguments as JSON for the frontend
                    try:
                        import json

                        parsed_args = json.loads(arguments) if arguments else {}
                    except json.JSONDecodeError:
                        parsed_args = {}

                    # Vercel AI SDK format for tool input available
                    yield {
                        "type": "tool-input-available",
                        "toolCallId": function_calls[output_index]["call_id"],
                        "toolName": function_calls[output_index]["name"],
                        "input": parsed_args,
                        "providerMetadata": {
                            "openai": {"itemId": function_calls[output_index]["id"]}
                        },
                    }
                continue

            elif event_type == "response.output_item.done":
                item = getattr(event, "item", None)
                if item and getattr(item, "type", "") == "function_call":
                    # Tool input is complete, frontend will execute it
                    pass
                continue

            # Content part events can be ignored for simple text streaming
            elif event_type in (
                "response.content_part.added",
                "response.output_text.added",
            ):
                continue

            # Completed: emit finish
            elif event_type == "response.completed":
                yield {"type": "finish-step"}
                yield {"type": "finish"}
                return

            # Error event
            elif event_type == "response.error":
                message = None
                if hasattr(event, "error") and hasattr(event.error, "message"):
                    message = event.error.message
                yield {"type": "error", "error": message or str(event)}
                return

    except Exception as e:
        yield {"type": "error", "error": str(e)}


# Placeholder for tool execution (would be implemented based on TipTap AI Toolkit)
def execute_tool(
    tool_name: str, input_data: dict[str, Any], current_chunk: int = 0
) -> dict[str, Any]:
    """
    Execute a tool (placeholder implementation)
    """
    # This would integrate with the actual document editing toolkit
    return {
        "output": f"Executed {tool_name} with input: {input_data}",
        "current_chunk": current_chunk + 1,
    }
