import os
from typing import Any

from dotenv import load_dotenv
from openai import AsyncOpenAI
from rich import print

load_dotenv()
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def convert_to_openai_input(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Convert UI messages (from our frontend) to OpenAI Responses API input format.

    Rules:
    - Remove local 'id' fields
    - For role user/system: send a single { role, content } with concatenated text
    - For role assistant:
        1) send any assistant text as { role: 'assistant', content }
        2) then emit any function calls as separate items: { type: 'function_call', ... }
        3) then emit any tool results as separate items: { type: 'function_call_output', ... }

    Our frontend stores tool call/result parts as:
      - tool_call: { type: 'tool_call', toolCallId, toolName, args }
      - tool_result: { type: 'tool_result', toolCallId, result }
    """
    input_list: list[dict[str, Any]] = []

    for msg in messages:
        role = msg.get("role", "")

        # Helper: gather text content from content or text parts
        def build_text_content(message: dict[str, Any]) -> str:
            content_text = message.get("content", "")
            if not content_text and "parts" in message:
                try:
                    text_parts = [
                        part.get("text", "")
                        for part in message.get("parts", [])
                        if part.get("type") == "text"
                    ]
                    content_text = "".join(text_parts)
                except Exception:
                    content_text = message.get("content", "")
            return content_text

        if role in ("user", "system"):
            content_text = build_text_content(msg)
            if content_text:
                input_list.append({"role": role, "content": content_text})
            continue

        if role == "assistant":
            content_text = build_text_content(msg)
            parts = msg.get("parts", []) or []

            # 1) Assistant text, if any
            if content_text:
                input_list.append({"role": "assistant", "content": content_text})

            # 2) Function calls (mapped from tool_call parts)
            for part in parts:
                if part.get("type") == "tool_call":
                    call_id = part.get("toolCallId") or part.get("call_id")
                    name = part.get("toolName") or part.get("name")
                    args = part.get("args") or part.get("arguments") or {}
                    # Arguments must be a string per OpenAI schema; stringify if needed
                    try:
                        import json as _json

                        arguments_str = (
                            args if isinstance(args, str) else _json.dumps(args or {})
                        )
                    except Exception:
                        arguments_str = "{}"

                    if call_id and name:
                        input_list.append(
                            {
                                "type": "function_call",
                                "call_id": call_id,
                                "name": name,
                                "arguments": arguments_str,
                                "id": f"fc_{call_id}",
                            }
                        )

            # 3) Tool results (mapped from tool_result parts)
            for part in parts:
                if part.get("type") == "tool_result":
                    call_id = part.get("toolCallId") or part.get("call_id")
                    output = part.get("result") or part.get("output")
                    if call_id is None:
                        continue
                    # Output must be a string
                    try:
                        import json as _json

                        output_str = (
                            output
                            if isinstance(output, str)
                            else _json.dumps(output if output is not None else {})
                        )
                    except Exception:
                        output_str = "{}"

                    input_list.append(
                        {
                            "type": "function_call_output",
                            "call_id": call_id,
                            "output": output_str,
                        }
                    )

            continue

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
    # openai_input = convert_to_openai_input(messages)
    openai_input = messages.copy()

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
            if event.type == "response.output_text.delta":
                delta = event.delta
                if delta:
                    yield delta
                continue
            # Function call started - initial function call item
            elif event.type == "response.output_item.added":
                function_calls[event.output_index] = event.item
                continue

            # Function call arguments streaming
            elif event.type == "response.function_call_arguments.delta":
                if function_calls[event.output_index]:
                    function_calls[event.output_index].arguments += event.delta
                continue

            # Function call arguments complete
            elif event.type == "response.function_call_arguments.done":
                index = event.output_index

                if function_calls[index]:
                    # Use consolidated final arguments to avoid duplicated strings like "{}{}"
                    function_calls[index].arguments = event.arguments

                    # Yield the function call object as a dictionary (not a JSON string)
                    obj = function_calls[index].model_dump()
                    print(obj)
                    yield obj
                continue

            elif event.type == "response.output_item.done":
                item = event.item
                if item and item.type == "function_call":
                    # Tool input is complete, frontend will execute it
                    pass
                continue

            # Content part events can be ignored for simple text streaming
            elif event.type in (
                "response.content_part.added",
                "response.output_text.added",
            ):
                continue

            # Completed: emit finish
            elif event.type == "response.completed":
                return

            # Error event
            elif event.type == "response.error":
                message = None
                if hasattr(event, "error") and hasattr(event.error, "message"):
                    message = event.error.message
                yield {"type": "error", "error": message or str(event)}
                return

    except Exception as e:
        yield {"type": "error", "error": str(e)}
