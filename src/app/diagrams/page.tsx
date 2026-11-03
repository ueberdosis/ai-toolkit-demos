"use client";

import { useChat } from "@ai-sdk/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AiToolkit, getAiToolkit } from "@tiptap-pro/client-ai-toolkit";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useRef, useState } from "react";
import { ChatSidebar } from "../../components/chat-sidebar";
import {
  diagramStyles,
  diagramsExtension,
  diagramsInitialContent,
} from "../../demos/diagrams/diagrams-setup";

export default function Page() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, AiToolkit, diagramsExtension],
    content: diagramsInitialContent,
  });

  // Fixes issue: https://github.com/vercel/ai/issues/7819
  const schemaAwareness = editor
    ? getAiToolkit(editor).getHtmlSchemaAwareness()
    : "";
  const schemaAwarenessRef = useRef(schemaAwareness);
  schemaAwarenessRef.current = schemaAwareness;

  const { messages, sendMessage, addToolOutput, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/schema-awareness",
      body: () => ({ schemaAwareness: schemaAwarenessRef.current }),
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      if (!editor) return;

      const { toolName, input, toolCallId } = toolCall;
      const result = getAiToolkit(editor).executeTool({ toolName, input });

      addToolOutput({ tool: toolName, toolCallId, output: result.output });
    },
  });

  const [input, setInput] = useState(
    "Add a pie chart of the June revenue and costs after the first paragraph",
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
      <style>{diagramStyles}</style>
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
