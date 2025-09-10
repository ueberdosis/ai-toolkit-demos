#!/usr/bin/env python3
"""
AI Service Helper Script

This script provides utilities for testing, debugging, and working with the AI service.
It includes functions for:
- Testing streaming chat completions
- Debugging tool calls
- Validating message formats
- Analyzing response structures
- Mock data generation for testing
"""

import asyncio
import json
import os
import sys
from typing import Any, Dict, List, Optional
from datetime import datetime

from dotenv import load_dotenv
from openai import AsyncOpenAI
from rich import print as rich_print
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ai_service import get_tool_definitions, stream_chat_completion

load_dotenv()
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
console = Console()


class AIHelper:
    """Helper class for AI service operations."""

    def __init__(self):
        self.client = client

    async def test_streaming_response(self, messages: List[Dict[str, Any]], model: str = "gpt-5-mini") -> None:
        """Test streaming response and display detailed event information."""
        console.print("\n[bold blue]Testing Streaming Response[/bold blue]")
        console.print("=" * 50)

        event_count = 0
        function_calls = {}

        async for event in stream_chat_completion(messages, model):
            event_count += 1
            self._display_event(event, event_count, function_calls)

    def _display_event(self, event: Any, event_count: int, function_calls: Dict[int, Any]) -> None:
        """Display a streaming event with rich formatting."""
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]

        if isinstance(event, str):
            # Text delta
            console.print(f"[{timestamp}] [green]TEXT:[/green] {repr(event)}")
        elif isinstance(event, dict):
            event_type = event.get('type', 'unknown')
            if event_type == 'error':
                console.print(f"[{timestamp}] [red]ERROR:[/red] {event.get('error', 'Unknown error')}")
            elif event_type in ['finish-step', 'finish']:
                console.print(f"[{timestamp}] [yellow]{event_type.upper()}[/yellow]")
            else:
                # Function call data
                console.print(f"[{timestamp}] [cyan]FUNCTION_CALLS:[/cyan] {len(event)} calls")
                for idx, call in event.items():
                    console.print(f"  Call {idx}: {call.get('name', 'unknown')} - {call.get('arguments', 'no args')}")
        else:
            # Raw event object
            console.print(f"[{timestamp}] [magenta]EVENT {event_count}:[/magenta] {type(event).__name__}")
            if hasattr(event, 'type'):
                console.print(f"  Type: {event.type}")
            if hasattr(event, 'delta'):
                console.print(f"  Delta: {repr(event.delta)}")
            if hasattr(event, '__dict__'):
                console.print(f"  Dict: {event.__dict__}")

    async def validate_tool_definitions(self) -> bool:
        """Validate that tool definitions are properly formatted."""
        console.print("\n[bold blue]Validating Tool Definitions[/bold blue]")
        console.print("=" * 50)

        tools = get_tool_definitions()
        is_valid = True

        for i, tool in enumerate(tools):
            console.print(f"\n[cyan]Tool {i + 1}: {tool.get('name', 'unnamed')}[/cyan]")

            # Check required fields
            required_fields = ['type', 'name', 'description', 'parameters']
            for field in required_fields:
                if field not in tool:
                    console.print(f"  [red]✗ Missing required field: {field}[/red]")
                    is_valid = False
                else:
                    console.print(f"  [green]✓ {field}[/green]")

            # Validate parameters structure
            if 'parameters' in tool:
                params = tool['parameters']
                if not isinstance(params, dict):
                    console.print(f"  [red]✗ Parameters should be a dict[/red]")
                    is_valid = False
                elif 'properties' not in params:
                    console.print(f"  [red]✗ Parameters missing 'properties'[/red]")
                    is_valid = False
                else:
                    console.print(f"  [green]✓ Parameters structure valid[/green]")

        if is_valid:
            console.print("\n[green]✓ All tool definitions are valid![/green]")
        else:
            console.print("\n[red]✗ Some tool definitions have issues![/red]")

        return is_valid

    async def test_direct_api_call(self, messages: List[Dict[str, Any]], model: str = "gpt-5-mini") -> None:
        """Test direct API call without streaming to see raw response."""
        console.print("\n[bold blue]Testing Direct API Call[/bold blue]")
        console.print("=" * 50)

        try:
            response = await client.responses.create(
                model=model,
                instructions="You are an assistant that can edit rich text documents.",
                input=messages,
                tools=get_tool_definitions(),
                stream=False,  # Non-streaming for inspection
            )

            console.print(f"[green]Response received![/green]")
            console.print(f"Response type: {type(response)}")
            console.print(f"Response attributes: {[attr for attr in dir(response) if not attr.startswith('_')]}")

            if hasattr(response, 'output'):
                console.print(f"\n[cyan]Output analysis:[/cyan]")
                console.print(f"Output type: {type(response.output)}")
                console.print(f"Output length: {len(response.output) if hasattr(response.output, '__len__') else 'N/A'}")

                # Analyze each output item
                if hasattr(response.output, '__iter__'):
                    for i, item in enumerate(response.output):
                        console.print(f"\n[yellow]Item {i}:[/yellow]")
                        console.print(f"  Type: {type(item)}")
                        if hasattr(item, 'type'):
                            console.print(f"  Item type: {item.type}")
                        if hasattr(item, 'content'):
                            console.print(f"  Content: {repr(item.content)}")
                        if hasattr(item, '__dict__'):
                            console.print(f"  Full dict: {item.__dict__}")

        except Exception as e:
            console.print(f"[red]Error in direct API call: {e}[/red]")

    def generate_test_messages(self, scenario: str = "basic") -> List[Dict[str, Any]]:
        """Generate test messages for different scenarios."""
        scenarios = {
            "basic": [
                {
                    "role": "user",
                    "content": "Hello, can you help me edit a document?"
                }
            ],
            "tool_call": [
                {
                    "role": "user",
                    "content": "Please read the first chunk of the document using the readFirstChunk tool."
                }
            ],
            "complex": [
                {
                    "role": "user",
                    "content": "I need to edit a document. First, read the document, then make some changes."
                }
            ],
            "error_test": [
                {
                    "role": "user",
                    "content": "Call a tool that doesn't exist."
                }
            ]
        }

        return scenarios.get(scenario, scenarios["basic"])

    async def benchmark_streaming(self, messages: List[Dict[str, Any]], iterations: int = 3) -> None:
        """Benchmark streaming performance."""
        console.print(f"\n[bold blue]Benchmarking Streaming Performance ({iterations} iterations)[/bold blue]")
        console.print("=" * 60)

        times = []

        for i in range(iterations):
            console.print(f"[cyan]Iteration {i + 1}/{iterations}...[/cyan]")

            start_time = datetime.now()
            event_count = 0

            async for event in stream_chat_completion(messages):
                event_count += 1

            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            times.append(duration)
            console.print(".2f")

        avg_time = sum(times) / len(times)
        console.print(".2f")

    async def debug_tool_call_flow(self, messages: List[Dict[str, Any]]) -> None:
        """Debug the tool call flow by tracking function call states."""
        console.print("\n[bold blue]Debugging Tool Call Flow[/bold blue]")
        console.print("=" * 50)

        function_calls = {}
        call_states = {}  # Track state of each function call

        async for event in stream_chat_completion(messages):
            if isinstance(event, dict) and 'type' not in event:
                # This is function call data
                for idx, call in event.items():
                    if idx not in call_states:
                        call_states[idx] = {'started': False, 'args_complete': False, 'finished': False}

                    if not call_states[idx]['started']:
                        console.print(f"[green]Function call {idx} started: {call.get('name', 'unknown')}[/green]")
                        call_states[idx]['started'] = True

                    if call.get('arguments') and not call_states[idx]['args_complete']:
                        console.print(f"[yellow]Function call {idx} arguments complete[/yellow]")
                        call_states[idx]['args_complete'] = True

        # Summary
        console.print("
[cyan]Function Call Summary:[/cyan]")
        for idx, state in call_states.items():
            status = "✓ Complete" if state['finished'] else "⚠ Incomplete"
            console.print(f"  Call {idx}: {status}")

    def display_message_format(self, messages: List[Dict[str, Any]]) -> None:
        """Display message format with validation."""
        console.print("\n[bold blue]Message Format Analysis[/bold blue]")
        console.print("=" * 50)

        table = Table(title="Message Structure")
        table.add_column("Index", style="cyan", no_wrap=True)
        table.add_column("Role", style="magenta")
        table.add_column("Content Type", style="green")
        table.add_column("Content Length", style="yellow")
        table.add_column("Valid", style="red")

        for i, msg in enumerate(messages):
            role = msg.get('role', 'unknown')
            content = msg.get('content', '')

            # Validate message structure
            is_valid = True
            if role not in ['user', 'assistant', 'system']:
                is_valid = False
            if not isinstance(content, str) or not content.strip():
                is_valid = False

            content_type = type(content).__name__
            content_length = len(content) if isinstance(content, str) else 'N/A'
            valid_status = "✓" if is_valid else "✗"

            table.add_row(str(i), role, content_type, str(content_length), valid_status)

        console.print(table)

        # Show sample content
        if messages:
            console.print("\n[cyan]Sample message content:[/cyan]")
            sample = messages[0]
            content = sample.get('content', '')
            if len(content) > 100:
                content = content[:100] + "..."
            console.print(f"'{content}'")


async def main():
    """Main function to run helper operations."""
    helper = AIHelper()

    # Parse command line arguments
    if len(sys.argv) < 2:
        console.print("[red]Usage: python ai_helper.py <command> [options][/red]")
        console.print("\nAvailable commands:")
        console.print("  validate-tools    - Validate tool definitions")
        console.print("  test-stream       - Test streaming response")
        console.print("  test-direct       - Test direct API call")
        console.print("  benchmark         - Benchmark streaming performance")
        console.print("  debug-tools       - Debug tool call flow")
        console.print("  analyze-messages  - Analyze message format")
        console.print("  generate-test     - Generate test messages")
        return

    command = sys.argv[1]

    if command == "validate-tools":
        await helper.validate_tool_definitions()

    elif command == "test-stream":
        scenario = sys.argv[2] if len(sys.argv) > 2 else "basic"
        messages = helper.generate_test_messages(scenario)
        await helper.test_streaming_response(messages)

    elif command == "test-direct":
        scenario = sys.argv[2] if len(sys.argv) > 2 else "basic"
        messages = helper.generate_test_messages(scenario)
        await helper.test_direct_api_call(messages)

    elif command == "benchmark":
        iterations = int(sys.argv[2]) if len(sys.argv) > 2 else 3
        messages = helper.generate_test_messages("basic")
        await helper.benchmark_streaming(messages, iterations)

    elif command == "debug-tools":
        scenario = sys.argv[2] if len(sys.argv) > 2 else "tool_call"
        messages = helper.generate_test_messages(scenario)
        await helper.debug_tool_call_flow(messages)

    elif command == "analyze-messages":
        scenario = sys.argv[2] if len(sys.argv) > 2 else "basic"
        messages = helper.generate_test_messages(scenario)
        helper.display_message_format(messages)

    elif command == "generate-test":
        scenario = sys.argv[2] if len(sys.argv) > 2 else "all"
        if scenario == "all":
            for name in ["basic", "tool_call", "complex", "error_test"]:
                messages = helper.generate_test_messages(name)
                console.print(f"\n[bold cyan]{name.upper()} SCENARIO:[/bold cyan]")
                console.print(json.dumps(messages, indent=2))
        else:
            messages = helper.generate_test_messages(scenario)
            console.print(json.dumps(messages, indent=2))

    else:
        console.print(f"[red]Unknown command: {command}[/red]")


if __name__ == "__main__":
    asyncio.run(main())
