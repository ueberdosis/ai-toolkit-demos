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
import { ChatSidebar } from "../../components/chat-sidebar";
import "../../styles/ai-caret.css";

export default function Page() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, AiToolkit, AiCaret],
    content: `<h1>AI agent demo</h1><p>Ask the AI to improve this.</p>`,
  });

  const { messages, sendMessage, addToolOutput, status } = useChat({
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

  const isLoading = status !== "ready";

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  if (!editor) return null;

  return (
    <div className="flex h-screen">
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      <ChatSidebar
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
