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
import { createPortal } from "react-dom";
import { ChatSidebar } from "../../components/chat-sidebar";
import { SuggestionReviewTooltip } from "../../components/suggestion-review-tooltip";
import "../../styles/suggestions-preview-mode.css";

type SuggestionTooltipMount = {
  suggestionId: string;
  element: HTMLElement;
};

export default function Page() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, AiToolkit],
    content: `<h1>AI agent demo</h1><p>Ask the AI to improve this.</p>`,
  });

  const [userFeedback, setUserFeedback] = useState<SuggestionFeedbackEvent[]>(
    [],
  );
  const [tooltipMount, setTooltipMount] =
    useState<SuggestionTooltipMount | null>(null);

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
              const decorations = [...options.defaultRenderDecorations()];

              if (options.isSelected) {
                decorations.push(
                  Decoration.widget(
                    options.range.to,
                    () => {
                      const element = document.createElement("span");
                      element.className =
                        "inline-block h-px w-px align-middle opacity-0 pointer-events-none";

                      setTooltipMount({
                        suggestionId: options.suggestion.id,
                        element,
                      });

                      return element;
                    },
                    {
                      destroy() {
                        setTooltipMount((prev) =>
                          prev?.suggestionId === options.suggestion.id
                            ? null
                            : prev,
                        );
                      },
                    },
                  ),
                );
              }

              return decorations;
            },
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

  const hasSuggestions = editor
    ? getAiToolkit(editor).getSuggestions().length > 0
    : false;
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
        {tooltipMount &&
          createPortal(
            <SuggestionReviewTooltip
              referenceElement={tooltipMount.element}
              text="Review this suggestion"
              onAccept={() => {
                const toolkit = getAiToolkit(editor);
                const result = toolkit.acceptSuggestion(
                  tooltipMount.suggestionId,
                );
                setUserFeedback((prev) => [
                  ...prev,
                  ...result.aiFeedback.events,
                ]);
                if (toolkit.getSuggestions().length === 0) {
                  acceptButtonRef.current?.click();
                }
              }}
              onReject={() => {
                const toolkit = getAiToolkit(editor);
                const result = toolkit.rejectSuggestion(
                  tooltipMount.suggestionId,
                );
                setUserFeedback((prev) => [
                  ...prev,
                  ...result.aiFeedback.events,
                ]);
                if (toolkit.getSuggestions().length === 0) {
                  rejectButtonRef.current?.click();
                }
              }}
            />,
            tooltipMount.element,
          )}
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
              Review suggestions in the document
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                ref={acceptButtonRef}
                onClick={() => {
                  const toolkit = getAiToolkit(editor);
                  const result = toolkit.acceptAllSuggestions();
                  const allFeedback = [
                    ...userFeedback,
                    ...result.aiFeedback.events,
                  ];

                  if (
                    allFeedback.length > 0 &&
                    allFeedback.some((event) => !event.accepted)
                  ) {
                    const feedbackText = `\n\n<user_feedback>\n${JSON.stringify(allFeedback)}\n</user_feedback>`;
                    sendMessage({ text: feedbackText });
                  }

                  setUserFeedback([]);
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
                  const allFeedback = [
                    ...userFeedback,
                    ...result.aiFeedback.events,
                  ];
                  const rejectionMessage =
                    "Some changes you made were rejected by the user. Ask the user why, and what you can do to improve them.";
                  const feedbackText = `${rejectionMessage}\n\n<user_feedback>\n${JSON.stringify(allFeedback)}\n</user_feedback>`;
                  sendMessage({ text: feedbackText });
                  setUserFeedback([]);
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
