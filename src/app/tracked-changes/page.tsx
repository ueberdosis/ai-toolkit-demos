"use client";

import { useChat } from "@ai-sdk/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AiToolkit, getAiToolkit } from "@tiptap-pro/ai-toolkit";
import {
  findSuggestions,
  TrackedChanges,
} from "@tiptap-pro/extension-tracked-changes";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useEffect, useState } from "react";
import { ChatSidebar } from "../../components/chat-sidebar";
import "../../styles/tracked-changes.css";

export default function Page() {
  const [hasSuggestions, setHasSuggestions] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TrackedChanges.configure({ enabled: false }),
      AiToolkit,
    ],
    content: `<h1>AI agent demo</h1><p>Ask the AI to improve this.</p>`,
  });

  // Track suggestion count reactively
  useEffect(() => {
    if (!editor) return;

    const onTransaction = () => {
      setHasSuggestions(findSuggestions(editor, "suggestion").length > 0);
    };

    editor.on("transaction", onTransaction);
    return () => {
      editor.off("transaction", onTransaction);
    };
  }, [editor]);

  const { messages, sendMessage, addToolOutput, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      if (!editor) return;

      const { toolName, input, toolCallId } = toolCall;

      const toolkit = getAiToolkit(editor);
      const result = toolkit.executeTool({
        toolName,
        input,
        reviewOptions: {
          mode: "trackedChanges",
          trackedChangesOptions: {
            userId: "ai-assistant",
          },
        },
      });

      addToolOutput({
        tool: toolName,
        toolCallId,
        output: result.output,
      });
    },
  });

  const [input, setInput] = useState(
    "Replace the last paragraph with a short story about Tiptap",
  );

  const isLoading = status !== "ready";
  const showReviewUI = !isLoading && hasSuggestions;

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
      >
        {showReviewUI && (
          <div className="border-t border-slate-200 p-4 space-y-2">
            <p className="text-xs text-slate-500">
              Review tracked changes in the document
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  editor.commands.acceptAllSuggestions();
                }}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium bg-[var(--green)] text-white hover:opacity-90 transition-all duration-200"
              >
                Accept all
              </button>
              <button
                type="button"
                onClick={() => {
                  editor.commands.rejectAllSuggestions();

                  const rejectionMessage =
                    "Some changes you made were rejected by the user. Ask the user why, and what you can do to improve them.";
                  sendMessage({ text: rejectionMessage });
                }}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium bg-[var(--gray-2)] text-[var(--black)] hover:bg-[var(--gray-3)] transition-all duration-200"
              >
                Reject all
              </button>
            </div>
          </div>
        )}
      </ChatSidebar>
    </div>
  );
}
