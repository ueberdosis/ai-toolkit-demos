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
import { useRef, useState } from "react";
import { ChatSidebar } from "../../components/chat-sidebar";
import "./suggestions.css";

export default function Page() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, AiToolkit],
    content: `<h1>AI agent demo</h1><p>Ask the AI to improve this.</p>`,
  });

  const [reviewState, setReviewState] = useState({
    // Whether to display the review UI
    isReviewing: false,
    // Data for the tool call result
    tool: "",
    toolCallId: "",
    output: {},
    // Feedback events collected from user actions
    userFeedback: [] as SuggestionFeedbackEvent[],
  });

  const acceptButtonRef = useRef<HTMLButtonElement>(null);
  const rejectButtonRef = useRef<HTMLButtonElement>(null);

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
        reviewOptions: {
          mode: "preview",
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
                    const result = toolkit.acceptSuggestion(
                      options.suggestion.id,
                    );
                    // Collect feedback events using functional update
                    setReviewState((prev) => ({
                      ...prev,
                      userFeedback: [
                        ...prev.userFeedback,
                        ...result.aiFeedback.events,
                      ],
                    }));
                    if (toolkit.getSuggestions().length === 0) {
                      acceptButtonRef.current?.click();
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
                    const result = toolkit.rejectSuggestion(
                      options.suggestion.id,
                    );
                    // Collect feedback events using functional update
                    setReviewState((prev) => ({
                      ...prev,
                      userFeedback: [
                        ...prev.userFeedback,
                        ...result.aiFeedback.events,
                      ],
                    }));
                    if (toolkit.getSuggestions().length === 0) {
                      rejectButtonRef.current?.click();
                    }
                  });
                  return element;
                }),
              ];
            },
          },
        },
      });

      // If the tool call modifies the document, halt the conversation and display the review UI
      if (result.docChanged) {
        // Show the review UI
        setReviewState({
          isReviewing: true,
          tool: toolName,
          toolCallId,
          output: result.output,
          userFeedback: [],
        });
      } else {
        // Continue the conversation
        addToolOutput({ tool: toolName, toolCallId, output: result.output });
      }
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
        disabled={reviewState.isReviewing}
      >
        {reviewState.isReviewing && (
          <div className="border-t border-slate-200 p-4 space-y-2">
            <p className="text-xs text-slate-500">
              Review suggestions in the document
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                ref={acceptButtonRef}
                onClick={() => {
                  const toolkit = getAiToolkit(editor);
                  const result = toolkit.acceptAllSuggestions();
                  // Combine all feedback events (previous + new)
                  const userFeedback = [
                    ...reviewState.userFeedback,
                    ...result.aiFeedback.events,
                  ];
                  let output = reviewState.output;

                  // Add feedback to tool output if there are any changes that were not accepted
                  if (
                    userFeedback.length > 0 &&
                    userFeedback.some((event) => !event.accepted)
                  ) {
                    output += `\n\n<user_feedback>\n${JSON.stringify(userFeedback)}\n</user_feedback>`;
                  }

                  addToolOutput({
                    tool: reviewState.tool,
                    toolCallId: reviewState.toolCallId,
                    output,
                  });
                  // Reset feedback events and close review UI
                  setReviewState({
                    ...reviewState,
                    isReviewing: false,
                    userFeedback: [],
                  });
                }}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium bg-[var(--green)] text-white hover:opacity-90 transition-all duration-200"
              >
                Accept all
              </button>
              <button
                type="button"
                ref={rejectButtonRef}
                onClick={() => {
                  const toolkit = getAiToolkit(editor);
                  const result = toolkit.rejectAllSuggestions();
                  // Combine all feedback events (previous + new)
                  const userFeedback = [
                    ...reviewState.userFeedback,
                    ...result.aiFeedback.events,
                  ];
                  // Combine rejection message with feedback in XML tags
                  const rejectionMessage =
                    "Some changes you made were rejected by the user. Ask the user why, and what you can do to improve them.";
                  const outputWithFeedback = `${rejectionMessage}\n\n<user_feedback>\n${JSON.stringify(userFeedback)}\n</user_feedback>`;
                  addToolOutput({
                    tool: reviewState.tool,
                    toolCallId: reviewState.toolCallId,
                    output: outputWithFeedback,
                  });
                  // Reset feedback events and close review UI
                  setReviewState({
                    ...reviewState,
                    isReviewing: false,
                    userFeedback: [],
                  });
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
