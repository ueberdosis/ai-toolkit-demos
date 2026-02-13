"use client";

import { useChat } from "@ai-sdk/react";
import { Selection } from "@tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AiToolkit, getAiToolkit } from "@tiptap-pro/ai-toolkit";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useState } from "react";
import { ChatSidebar } from "../../components/chat-sidebar";
import "./selection.css";

export default function Page() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, AiToolkit, Selection],
    content: `<p>This is another paragraph that you can select. Tiptap is a rich text editor that you can use to edit your text. It is a powerful tool that you can use to create beautiful documents. With the AI Toolkit, you can give your AI the ability to edit your document in real time.</p>
<p>This is yet another paragraph that you can select. Tiptap is a rich text editor that you can use to edit your text. It is a powerful tool that you can use to create beautiful documents. With the AI Toolkit, you can give your AI the ability to edit your document in real time.</p>`,
  });

  const { messages, sendMessage, addToolOutput, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/selection-awareness" }),
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
    "Translate the selected content to Spanish",
  );

  const isLoading = status !== "ready";

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!editor || !input.trim()) return;
    const toolkit = getAiToolkit(editor);
    toolkit.setActiveSelection(editor.state.selection);
    sendMessage({ text: input });
    setInput("");
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
