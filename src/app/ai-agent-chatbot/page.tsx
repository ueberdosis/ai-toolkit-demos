"use client";

import { useChat } from "@ai-sdk/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AiToolkit, getAiToolkit } from "@tiptap-pro/ai-toolkit";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useState } from "react";
import { ChatSidebar } from "../../components/chat-sidebar";

export default function Page() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, AiToolkit],
    content: `<h1>AI agent demo</h1><p>Ask the AI to improve this.</p>`,
  });

  const { messages, sendMessage, addToolOutput, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      if (!editor) return;

      const { toolName, input, toolCallId } = toolCall;

      // Use the AI Toolkit to execute the tool
      const toolkit = getAiToolkit(editor);
      const result = toolkit.executeTool({
        toolName,
        input,
      });

      addToolOutput({ tool: toolName, toolCallId, output: result.output });
    },
  });

  const [input, setInput] = useState(
    "Replace the last paragraph with a short story about Tiptap",
  );

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
