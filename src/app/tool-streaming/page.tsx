"use client";

import { useChat } from "@ai-sdk/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AiCaret, AiToolkit, getAiToolkit } from "@tiptap-pro/ai-toolkit";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useEffect, useState } from "react";
import "./styles.css";

export default function Page() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, AiToolkit, AiCaret],
    content: `<h1>AI agent demo</h1><p>Ask the AI to improve this.</p>`,
  });

  const { messages, sendMessage, addToolOutput } = useChat({
    transport: new DefaultChatTransport({ api: "/api/tool-streaming" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      if (!editor) return;

      const { toolName, input, toolCallId } = toolCall;

      // When the tool streaming is complete, we need to apply the tool call to the document
      // Use the AI Toolkit to execute the tool
      const toolkit = getAiToolkit(editor);
      const result = toolkit.streamTool({
        toolCallId,
        toolName,
        input,
        // This parameter indicates that the tool streaming is complete
        hasFinished: true,
      });

      addToolOutput({ tool: toolName, toolCallId, output: result.output });
    },
  });

  const [input, setInput] = useState(
    "Insert, at the end of the document, a story with 2 paragraphs about Tiptap",
  );

  // While the tool streaming is in progress, we need to update the document
  // as the tool input changes
  useEffect(() => {
    if (!editor) return;

    // Find the last message
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    // Find the last tool that the AI has just called
    const toolCallParts =
      lastMessage.parts.filter((p) => p.type.startsWith("tool-")) ?? [];
    const lastToolCall = toolCallParts[toolCallParts.length - 1];
    if (!lastToolCall) return;

    // Get the tool call data
    interface ToolStreamingPart {
      input: unknown;
      state: string;
      toolCallId: string;
      type: string;
    }
    const part = lastToolCall as ToolStreamingPart;
    if (!(part.state === "input-streaming")) return;
    const toolName = part.type.replace("tool-", "");

    // Apply the tool call to the document, while it is streaming
    const toolkit = getAiToolkit(editor);
    toolkit.streamTool({
      toolCallId: part.toolCallId,
      toolName,
      input: part.input,
    });
  }, [editor, messages]);

  if (!editor) return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Tool streaming demo</h1>

      <div className="mb-6">
        <EditorContent
          editor={editor}
          className="border border-gray-300 rounded-lg p-4 min-h-[200px]"
        />
      </div>

      <div className="mb-6 space-y-4">
        {messages?.map((message) => (
          <div key={message.id} className="bg-gray-100 p-4 rounded-lg">
            <strong className="text-blue-600">{message.role}</strong>
            <br />
            <div className="mt-2 whitespace-pre-wrap">
              {message.parts
                .filter((p) => p.type === "text")
                .map((p) => p.text)
                .join("\n") || "Loading..."}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input });
            setInput("");
          }
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
          placeholder="Ask the AI to improve the document..."
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
        >
          Send
        </button>
      </form>
    </div>
  );
}
