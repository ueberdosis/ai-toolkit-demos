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
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChatSidebar } from "../../components/chat-sidebar";
import { SuggestionReviewTooltip } from "../../components/suggestion-review-tooltip";
import "../../styles/tracked-changes.css";

type SuggestionTooltipMount = {
  suggestionId: string;
  element: HTMLElement;
  text: string;
};

export default function Page() {
  const [hasSuggestions, setHasSuggestions] = useState(false);
  const [tooltipMount, setTooltipMount] =
    useState<SuggestionTooltipMount | null>(null);
  const anchorRef = useRef<HTMLSpanElement | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TrackedChanges.configure({
        enabled: false,
      }),
      AiToolkit,
    ],
    content: `<h1>Tracked changes demo</h1><p>Ask the AI to improve this document. AI edits are written as tracked changes so you can accept or reject them one by one.</p>`,
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const updateSuggestionState = () => {
      setHasSuggestions(findSuggestions(editor, "suggestion").length > 0);
    };

    const updateTooltip = () => {
      const { from } = editor.state.selection;
      const selectedSuggestion = findSuggestions(editor, "suggestion").find(
        (suggestion) => from >= suggestion.from && from <= suggestion.to,
      );

      if (!selectedSuggestion) {
        setTooltipMount(null);
        return;
      }

      const coords = editor.view.coordsAtPos(selectedSuggestion.to);

      if (!anchorRef.current) {
        anchorRef.current = document.createElement("span");
        anchorRef.current.style.cssText =
          "position: fixed; width: 1px; height: 1px; pointer-events: none;";
        document.body.appendChild(anchorRef.current);
      }

      anchorRef.current.style.left = `${coords.left}px`;
      anchorRef.current.style.top = `${coords.top}px`;

      setTooltipMount({
        suggestionId: selectedSuggestion.id,
        element: anchorRef.current,
        text: "Review this tracked change",
      });
    };

    updateSuggestionState();
    updateTooltip();

    editor.on("transaction", updateSuggestionState);
    editor.on("selectionUpdate", updateTooltip);

    return () => {
      editor.off("transaction", updateSuggestionState);
      editor.off("selectionUpdate", updateTooltip);
      anchorRef.current?.remove();
      anchorRef.current = null;
    };
  }, [editor]);

  const { messages, sendMessage, addToolOutput, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/tracked-changes" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      if (!editor) {
        return;
      }

      const toolkit = getAiToolkit(editor);
      const result = toolkit.executeTool({
        toolName: toolCall.toolName,
        input: toolCall.input,
        reviewOptions: {
          mode: "trackedChanges",
          trackedChangesOptions: {
            userId: "ai-assistant",
            userMetadata: {
              name: "AI",
            },
          },
        },
      });

      addToolOutput({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        output: result.output,
      });
    },
  });

  const [input, setInput] = useState(
    "Replace the last paragraph with a short story about Tiptap.",
  );

  const isLoading = status !== "ready";
  const showReviewUi = !isLoading && hasSuggestions;

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();

    if (input.trim()) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="flex h-screen tracked-changes-demo">
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
        {tooltipMount &&
          createPortal(
            <SuggestionReviewTooltip
              referenceElement={tooltipMount.element}
              text={tooltipMount.text}
              onAccept={() => {
                editor.commands.acceptSuggestion({
                  id: tooltipMount.suggestionId,
                });
              }}
              onReject={() => {
                editor.commands.rejectSuggestion({
                  id: tooltipMount.suggestionId,
                });
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
        {showReviewUi && (
          <div className="border-t border-slate-200 p-4 space-y-2">
            <p className="text-xs text-slate-500">
              Review tracked changes in the document.
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
                  sendMessage({
                    text: "Some changes were rejected. Ask the user what should be improved before you edit the document again.",
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
