"use client";

import { Selection } from "@tiptap/extensions";
import { Decoration } from "@tiptap/pm/view";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AiCaret, AiToolkit, getAiToolkit } from "@tiptap-pro/ai-toolkit";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { SuggestionReviewTooltip } from "../../components/suggestion-review-tooltip";
import { ToolbarPanel } from "../../components/toolbar-panel";
import "../../styles/ai-caret.css";
import "../insert-content-workflow/selection.css";
import "../../styles/suggestions-preview-mode.css";

type SuggestionTooltipMount = {
  suggestionId: string;
  element: HTMLElement;
};

export default function Page() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, AiToolkit, Selection, AiCaret],
    content: `<p>Select some text and click the "Add emojis" button to add emojis to your selection.</p>
<p>This is another paragraph that you can select. Tiptap is a rich text editor that you can use to edit your text. It is a powerful tool that you can use to create beautiful documents. With the AI Toolkit, you can give your AI the ability to edit your document in real time.</p>
<p>This is yet another paragraph that you can select. Tiptap is a rich text editor that you can use to edit your text. It is a powerful tool that you can use to create beautiful documents. With the AI Toolkit, you can give your AI the ability to edit your document in real time.</p>`,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [tooltipMount, setTooltipMount] =
    useState<SuggestionTooltipMount | null>(null);
  const selectionIsEmpty = useEditorState({
    editor,
    selector: (snapshot) => snapshot.editor?.state.selection.empty ?? true,
  });

  const hasSuggestions = useEditorState({
    editor,
    selector: (snapshot) => {
      if (!snapshot.editor) return false;
      return getAiToolkit(snapshot.editor).getSuggestions().length > 0;
    },
  });

  if (!editor) return null;

  const editSelection = async (task: string) => {
    editor.commands.blur();
    setIsLoading(true);

    const toolkit = getAiToolkit(editor);
    const selectionRange = editor.state.selection;
    const selection = toolkit.getHtmlRange(selectionRange);

    const response = await fetch("/api/insert-content-workflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, replace: selection }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const readableStream = response.body;
    if (!readableStream) {
      throw new Error("No response body");
    }

    await toolkit.streamHtml(readableStream, {
      position: selectionRange,
      reviewOptions: {
        mode: "preview",
        useDiffUtility: false,
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

    setIsLoading(false);
  };

  const disabled = selectionIsEmpty || isLoading;
  const showReviewUI = !isLoading && hasSuggestions;

  const buttonClassName =
    "inline-flex items-center gap-1.5 rounded-lg border-none bg-[var(--gray-2)] text-[var(--black)] px-2.5 py-1.5 text-sm font-medium hover:bg-[var(--gray-3)] disabled:bg-[var(--gray-1)] disabled:text-[var(--gray-4)] transition-all duration-200 cursor-pointer disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col h-screen">
      <ToolbarPanel>
        <button
          type="button"
          onClick={() => editSelection("Add emojis to this text")}
          disabled={disabled}
          className={buttonClassName}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={14} /> Loading...
            </>
          ) : (
            "Add emojis"
          )}
        </button>
        <button
          type="button"
          onClick={() => editSelection("Make the text twice as long")}
          disabled={disabled}
          className={buttonClassName}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={14} /> Loading...
            </>
          ) : (
            "Make text longer"
          )}
        </button>
        {showReviewUI && (
          <>
            <div className="w-px h-6 bg-slate-200" />
            <button
              type="button"
              onClick={() => {
                const toolkit = getAiToolkit(editor);
                toolkit.acceptAllSuggestions();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border-none bg-emerald-500 text-white px-2.5 py-1.5 text-sm font-medium hover:bg-emerald-600 transition-all duration-200 cursor-pointer"
            >
              Accept all
            </button>
            <button
              type="button"
              onClick={() => {
                const toolkit = getAiToolkit(editor);
                toolkit.rejectAllSuggestions();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border-none bg-rose-500 text-white px-2.5 py-1.5 text-sm font-medium hover:bg-rose-600 transition-all duration-200 cursor-pointer"
            >
              Reject all
            </button>
          </>
        )}
      </ToolbarPanel>
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
        {tooltipMount &&
          createPortal(
            <SuggestionReviewTooltip
              referenceElement={tooltipMount.element}
              text="Preview this change"
              onAccept={() => {
                const toolkit = getAiToolkit(editor);
                toolkit.acceptSuggestion(tooltipMount.suggestionId);
              }}
              onReject={() => {
                const toolkit = getAiToolkit(editor);
                toolkit.rejectSuggestion(tooltipMount.suggestionId);
              }}
            />,
            tooltipMount.element,
          )}
      </div>
    </div>
  );
}
