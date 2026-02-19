"use client";

import { useChat } from "@ai-sdk/react";
import { Decoration } from "@tiptap/pm/view";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AiToolkit,
  getAiToolkit,
  type SuggestionFeedbackEvent,
} from "@tiptap-pro/ai-toolkit";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useState } from "react";
import { ChatSidebar } from "../../components/chat-sidebar";
import "../../styles/suggestions-review-mode.css";

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

      // Reset feedback events when a new tool call starts
      setReviewState((prev) => ({ ...prev, userFeedback: [] }));

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
  const [reviewState, setReviewState] = useState({
    isComparing: false,
    userFeedback: [] as SuggestionFeedbackEvent[],
  });

  const isLoading = status !== "ready";

  if (!editor) return null;

  const toolkit = getAiToolkit(editor);

  function stopComparing() {
    toolkit.stopComparingDocuments();
    setReviewState((prev) => ({ ...prev, isComparing: false }));
  }

  const showReviewUI = reviewState.isComparing && status === "ready";

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();

    if (reviewState.isComparing) return;

    // Build message text with feedback if available
    let messageText = input.trim();
    if (reviewState.userFeedback.length > 0) {
      const feedbackOutput = JSON.stringify(reviewState.userFeedback);
      messageText += `\n\n<user_feedback>${feedbackOutput}</user_feedback>`;
    }

    toolkit.startComparingDocuments({
      displayOptions: {
        renderDecorations(options) {
          return [
            ...options.defaultRenderDecorations(),

            // Accept button
            Decoration.widget(options.range.to, () => {
              const element = document.createElement("button");
              element.textContent = "Accept";
              element.className =
                "ml-2 bg-green-500 text-white px-2 py-1 rounded text-sm hover:bg-green-600";
              element.addEventListener("click", () => {
                const result = toolkit.acceptSuggestion(options.suggestion.id);
                setReviewState((prev) => ({
                  ...prev,
                  userFeedback: [
                    ...prev.userFeedback,
                    ...result.aiFeedback.events,
                  ],
                }));
                if (toolkit.getSuggestions().length === 0) {
                  stopComparing();
                }
              });
              return element;
            }),

            // Reject button
            Decoration.widget(options.range.to, () => {
              const element = document.createElement("button");
              element.textContent = "Reject";
              element.className =
                "ml-2 bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600";
              element.addEventListener("click", () => {
                const result = toolkit.rejectSuggestion(options.suggestion.id);
                setReviewState((prev) => ({
                  ...prev,
                  userFeedback: [
                    ...prev.userFeedback,
                    ...result.aiFeedback.events,
                  ],
                }));
                if (toolkit.getSuggestions().length === 0) {
                  stopComparing();
                }
              });
              return element;
            }),
          ];
        },
      },
    });
    setReviewState((prev) => ({ ...prev, isComparing: true }));

    if (messageText) {
      sendMessage({ text: messageText });
      setInput("");
      setReviewState((prev) => ({ ...prev, userFeedback: [] }));
    }
  };

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
        disabled={reviewState.isComparing}
      >
        {showReviewUI && (
          <div className="border-t border-slate-200 p-4 space-y-2">
            <p className="text-xs text-slate-500">
              Review suggestions in the document
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const result = toolkit.acceptAllSuggestions();
                  // Collect all feedback events
                  const userFeedback = [
                    ...reviewState.userFeedback,
                    ...result.aiFeedback.events,
                  ];
                  setReviewState({
                    isComparing: false,
                    userFeedback,
                  });
                  toolkit.stopComparingDocuments();
                }}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium bg-[var(--green)] text-white hover:opacity-90 transition-all duration-200"
              >
                Accept all
              </button>
              <button
                type="button"
                onClick={() => {
                  const result = toolkit.rejectAllSuggestions();
                  // Collect all feedback events
                  const userFeedback = [
                    ...reviewState.userFeedback,
                    ...result.aiFeedback.events,
                  ];
                  setReviewState({
                    isComparing: false,
                    userFeedback,
                  });
                  toolkit.stopComparingDocuments();
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
