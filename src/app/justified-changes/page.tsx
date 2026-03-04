"use client";

import { useChat } from "@ai-sdk/react";
import { computePosition, flip, offset, shift } from "@floating-ui/dom";
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
import "../../styles/suggestions-preview-mode.css";

export default function Page() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, AiToolkit],
    content: `<h1>AI agent demo</h1><p>Ask the AI to improve this.</p>`,
  });

  const [userFeedback, setUserFeedback] = useState<SuggestionFeedbackEvent[]>(
    [],
  );

  const acceptButtonRef = useRef<HTMLButtonElement>(null);
  const rejectButtonRef = useRef<HTMLButtonElement>(null);

  const { messages, sendMessage, addToolOutput, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/justified-changes",
    }),
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

              // Add justification tooltip with actions when selected
              if (options.isSelected) {
                decorations.push(
                  Decoration.widget(options.range.to, () => {
                    const container = document.createElement("span");
                    container.style.position = "relative";
                    container.style.display = "inline";

                    const tooltip = document.createElement("div");
                    tooltip.style.cssText = `
                      position: absolute;
                      background: white;
                      color: #1f2937;
                      padding: 8px 12px;
                      border-radius: 8px;
                      border: 1px solid #e5e7eb;
                      font-size: 13px;
                      line-height: 1.5;
                      max-width: 400px;
                      width: max-content;
                      white-space: normal;
                      z-index: 50;
                      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06);
                      pointer-events: auto;
                    `;

                    const text = document.createElement("p");
                    text.textContent =
                      (options.suggestion.metadata?.operationMeta as string) ||
                      "No justification provided.";
                    text.style.margin = "0";

                    const actions = document.createElement("div");
                    actions.style.cssText = `
                      display: flex;
                      gap: 8px;
                      margin-top: 10px;
                    `;

                    // Accept action for the selected suggestion
                    const accept = document.createElement("button");
                    accept.type = "button";
                    accept.textContent = "Accept";
                    accept.className =
                      "bg-green-500 text-white px-2 py-1 rounded text-sm hover:bg-green-600";
                    accept.addEventListener("click", (event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const result = toolkit.acceptSuggestion(
                        options.suggestion.id,
                      );
                      setUserFeedback((prev) => [
                        ...prev,
                        ...result.aiFeedback.events,
                      ]);
                      if (toolkit.getSuggestions().length === 0) {
                        acceptButtonRef.current?.click();
                      }
                    });

                    // Reject action for the selected suggestion
                    const reject = document.createElement("button");
                    reject.type = "button";
                    reject.textContent = "Reject";
                    reject.className =
                      "bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600";
                    reject.addEventListener("click", (event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const result = toolkit.rejectSuggestion(
                        options.suggestion.id,
                      );
                      setUserFeedback((prev) => [
                        ...prev,
                        ...result.aiFeedback.events,
                      ]);
                      if (toolkit.getSuggestions().length === 0) {
                        rejectButtonRef.current?.click();
                      }
                    });

                    // Tooltip layout: justification text followed by action buttons
                    actions.appendChild(accept);
                    actions.appendChild(reject);
                    tooltip.appendChild(text);
                    tooltip.appendChild(actions);
                    container.appendChild(tooltip);

                    requestAnimationFrame(() => {
                      computePosition(container, tooltip, {
                        placement: "top",
                        middleware: [offset(8), flip(), shift({ padding: 8 })],
                      }).then(({ x, y }) => {
                        Object.assign(tooltip.style, {
                          left: `${x}px`,
                          top: `${y}px`,
                        });
                      });
                    });

                    return container;
                  }),
                );
              }

              return decorations;
            },
          },
        },
      });

      // Always continue the conversation — never halt for review
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
