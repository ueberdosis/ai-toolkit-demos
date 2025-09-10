import os
from typing import Any

from dotenv import load_dotenv
from openai import AsyncOpenAI
from rich import print

load_dotenv()
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


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

    # Debug print to see what we're sending to OpenAI
    print("OpenAI input being sent:")
    print(messages)

    try:
        stream = await client.responses.create(
            model=model,
            instructions=system_message,
            input=messages,
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
                    function_calls[index].arguments += event.arguments

                    yield function_calls
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
                yield {"type": "finish-step"}
                yield {"type": "finish"}
                return

            # Error event
            elif event.type == "response.error":
                message = None
                if event.error and event.error.message:
                    message = event.error.message
                yield {"type": "error", "error": message or str(event)}
                return

    except Exception as e:
        yield {"type": "error", "error": str(e)}
