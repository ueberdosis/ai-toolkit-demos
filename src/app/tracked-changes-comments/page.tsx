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
import { MessageSquareText } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChatSidebar } from "../../components/chat-sidebar";
import { SuggestionReviewTooltip } from "../../components/suggestion-review-tooltip";
import "../../styles/tracked-changes.css";

type SuggestionTooltipMount = {
  suggestionId: string;
  element: HTMLElement;
  text?: string;
};

type JustificationEntry = {
  suggestionId: string;
  justification: string;
};

export default function Page() {
  const [justifications, setJustifications] = useState<JustificationEntry[]>(
    [],
  );
  const [tooltipMount, setTooltipMount] =
    useState<SuggestionTooltipMount | null>(null);
  const [hasSuggestions, setHasSuggestions] = useState(false);
  const anchorRef = useRef<HTMLSpanElement | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TrackedChanges.configure({ enabled: false }),
      AiToolkit,
    ],
    content: `<h1>AI agent demo</h1><p>Ask the AI to improve this.</p>`,
  });

  const collectJustifications = useCallback(() => {
    if (!editor) return;
    const trackedChangeMetadata = editor.storage.aiToolkit
      .trackedChangeMetadata as Record<string, string>;
    const suggestions = findSuggestions(editor, "suggestion");
    const entries: JustificationEntry[] = suggestions
      .filter((s) => trackedChangeMetadata[s.id])
      .map((s) => ({
        suggestionId: s.id,
        justification: trackedChangeMetadata[s.id],
      }));
    setJustifications(entries);
    setHasSuggestions(suggestions.length > 0);
  }, [editor]);

  // Update hasSuggestions and tooltip on every transaction
  useEffect(() => {
    if (!editor) return;

    const onTransaction = () => {
      const suggestions = findSuggestions(editor, "suggestion");
      setHasSuggestions(suggestions.length > 0);
    };

    const onSelectionUpdate = () => {
      const { from } = editor.state.selection;
      const suggestions = findSuggestions(editor, "suggestion");
      const selected = suggestions.find((s) => from >= s.from && from <= s.to);

      if (!selected) {
        setTooltipMount(null);
        return;
      }

      const trackedChangeMetadata = editor.storage.aiToolkit
        .trackedChangeMetadata as Record<string, string>;
      const meta = trackedChangeMetadata[selected.id];

      // Position an absolutely-placed anchor at the end of the suggestion
      // so floating-ui can reference it for tooltip placement.
      const coords = editor.view.coordsAtPos(selected.to);
      if (!anchorRef.current) {
        anchorRef.current = document.createElement("span");
        anchorRef.current.style.cssText =
          "position:fixed;width:1px;height:1px;pointer-events:none;";
        document.body.appendChild(anchorRef.current);
      }
      anchorRef.current.style.left = `${coords.left}px`;
      anchorRef.current.style.top = `${coords.top}px`;

      setTooltipMount({
        suggestionId: selected.id,
        element: anchorRef.current,
        text: meta || "No justification provided.",
      });
    };

    editor.on("transaction", onTransaction);
    editor.on("selectionUpdate", onSelectionUpdate);

    return () => {
      editor.off("transaction", onTransaction);
      editor.off("selectionUpdate", onSelectionUpdate);
      anchorRef.current?.remove();
      anchorRef.current = null;
    };
  }, [editor]);

  const { messages, sendMessage, addToolOutput, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/tracked-changes-comments",
    }),
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
            userName: "AI",
          },
        },
      });

      // Collect justifications after each tool execution
      setTimeout(collectJustifications, 50);

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
      <div className="flex-1 flex flex-col overflow-hidden">
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
                  setJustifications((prev) =>
                    prev.filter(
                      (j) => j.suggestionId !== tooltipMount.suggestionId,
                    ),
                  );
                }}
                onReject={() => {
                  editor.commands.rejectSuggestion({
                    id: tooltipMount.suggestionId,
                  });
                  setJustifications((prev) =>
                    prev.filter(
                      (j) => j.suggestionId !== tooltipMount.suggestionId,
                    ),
                  );
                }}
              />,
              tooltipMount.element,
            )}
        </div>

        {/* Justifications panel */}
        {justifications.length > 0 && (
          <div className="border-t border-slate-200 bg-slate-50 max-h-48 overflow-y-auto">
            <div className="px-4 py-2 border-b border-slate-200 bg-white sticky top-0">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <MessageSquareText size={14} />
                AI Justifications ({justifications.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-200">
              {justifications.map((entry) => (
                <div
                  key={entry.suggestionId}
                  className="px-4 py-2.5 hover:bg-slate-100 transition-colors cursor-default"
                >
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {entry.justification}
                  </p>
                </div>
              ))}
            </div>
          </div>
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
              Review tracked changes in the document. Click on a change to see
              its justification.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  editor.commands.acceptAllSuggestions();
                  setJustifications([]);
                }}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium bg-[var(--green)] text-white hover:opacity-90 transition-all duration-200"
              >
                Accept all
              </button>
              <button
                type="button"
                onClick={() => {
                  editor.commands.rejectAllSuggestions();
                  setJustifications([]);

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
