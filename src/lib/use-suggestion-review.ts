"use client";

import type { Editor } from "@tiptap/react";
import {
  findSuggestions,
  type Suggestion,
} from "@tiptap-pro/extension-tracked-changes";
import { useEffect, useRef, useState } from "react";
import { getUniqueSuggestions } from "@/demos/server-ai-tracked-changes/suggestion-utils";

export type SuggestionTooltipMount = {
  suggestionId: string;
  element: HTMLElement;
  text: string;
};

/**
 * Tracks tracked-change suggestions in the editor and positions the
 * per-suggestion accept/reject tooltip against the current selection. Returns
 * the deduped suggestion list (for the review panel) and the tooltip mount
 * (for the floating accept/reject popover). Mirrors the
 * `server-ai-tracked-changes` demo's review wiring.
 */
export function useSuggestionReview(editor: Editor | null) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [tooltipMount, setTooltipMount] =
    useState<SuggestionTooltipMount | null>(null);
  const anchorRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!editor) return;

    const updateSuggestions = () => {
      setSuggestions(
        getUniqueSuggestions(findSuggestions(editor, "suggestion")),
      );
    };

    const updateTooltip = () => {
      const { from } = editor.state.selection;
      const selected = findSuggestions(editor, "suggestion").find(
        (suggestion) => from >= suggestion.from && from <= suggestion.to,
      );

      if (!selected) {
        setTooltipMount(null);
        return;
      }

      const coords = editor.view.coordsAtPos(selected.to);

      if (!anchorRef.current) {
        anchorRef.current = document.createElement("span");
        anchorRef.current.style.cssText =
          "position: fixed; width: 1px; height: 1px; pointer-events: none;";
        document.body.appendChild(anchorRef.current);
      }

      anchorRef.current.style.left = `${coords.left}px`;
      anchorRef.current.style.top = `${coords.top}px`;

      setTooltipMount({
        suggestionId: selected.id,
        element: anchorRef.current,
        text: "Review this tracked change",
      });
    };

    updateSuggestions();
    updateTooltip();

    editor.on("transaction", updateSuggestions);
    editor.on("selectionUpdate", updateTooltip);

    return () => {
      editor.off("transaction", updateSuggestions);
      editor.off("selectionUpdate", updateTooltip);
      anchorRef.current?.remove();
      anchorRef.current = null;
    };
  }, [editor]);

  return { suggestions, tooltipMount };
}
