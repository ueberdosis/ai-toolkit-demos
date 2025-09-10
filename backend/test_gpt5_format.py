#!/usr/bin/env python3

import asyncio
import os

from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def test_gpt5_response_format():
    """Test what GPT-5 actually returns in response.output"""

    response = await client.responses.create(
        model="gpt-5-mini",
        instructions="You are an assistant that can edit rich text documents.",
        input=[
            {
                "role": "user",
                "content": "Call readFirstChunk to read the document",
            }
        ],
        tools=[
            {
                "type": "function",
                "name": "readFirstChunk",
                "description": "Read the first chunk of the document.",
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": [],
                    "additionalProperties": False,
                },
                "strict": True,
            }
        ],
    )

    print("=== FULL RESPONSE ===")
    print(f"Response type: {type(response)}")
    print(f"Response attributes: {dir(response)}")

    print("\n=== RESPONSE.OUTPUT ===")
    print(f"Output type: {type(response.output)}")
    print(f"Output length: {len(response.output)}")

    for i, item in enumerate(response.output):
        print(f"\n--- Item {i} ---")
        print(f"Type: {type(item)}")
        print(f"Attributes: {dir(item)}")

        # Try to convert to dict to see structure
        if hasattr(item, "__dict__"):
            print(f"Dict: {item.__dict__}")
        elif hasattr(item, "model_dump"):
            print(f"Model dump: {item.model_dump()}")
        else:
            print(f"String repr: {item}")


if __name__ == "__main__":
    asyncio.run(test_gpt5_response_format())
