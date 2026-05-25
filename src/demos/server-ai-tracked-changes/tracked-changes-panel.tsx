"use client";

import type { Editor } from "@tiptap/react";
import type { Suggestion } from "@tiptap-pro/extension-tracked-changes";
import {
  getSuggestionNodeLabels,
  getSuggestionPreview,
} from "./suggestion-utils";

type TrackedChangesPanelProps = {
  editor: Editor;
  suggestions: Suggestion[];
  reasonBySuggestionId?: Record<string, string>;
};

function suggestionAccent(type: string) {
  if (type === "add") {
    return "border-l-emerald-500";
  }
  if (type === "delete") {
    return "border-l-rose-500";
  }
  if (type === "replace") {
    return "border-l-amber-500";
  }
  if (type === "markChange") {
    return "border-l-purple-500";
  }
  if (type === "sink") {
    return "border-l-teal-500";
  }
  if (type === "lift") {
    return "border-l-violet-500";
  }
  return "border-l-blue-500";
}

export function TrackedChangesPanel({
  editor,
  suggestions,
  reasonBySuggestionId = {},
}: TrackedChangesPanelProps) {
  const buttonClass =
    "cursor-pointer rounded-lg border-none bg-[var(--gray-2)] px-2.5 py-1.5 text-sm font-medium leading-[1.15] text-[var(--black)] transition-all duration-200 ease-[cubic-bezier(0.65,0.05,0.36,1)] hover:bg-[var(--gray-3)] hover:text-[var(--black-contrast)] disabled:cursor-default disabled:bg-[var(--gray-1)] disabled:text-[var(--gray-4)]";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-slate-200 p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Suggestions ({suggestions.length})
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Review pending tracked edits.
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => editor.commands.acceptAllSuggestions()}
              disabled={suggestions.length === 0}
              className={buttonClass}
            >
              Accept all
            </button>
            <button
              type="button"
              onClick={() => editor.commands.rejectAllSuggestions()}
              disabled={suggestions.length === 0}
              className={buttonClass}
            >
              Reject all
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {suggestions.length === 0 ? (
          <p className="text-sm italic text-slate-400">
            No pending suggestions.
          </p>
        ) : (
          <div className="space-y-2">
            {suggestions.map((suggestion) => {
              const labels = getSuggestionNodeLabels(suggestion);

              return (
                <article
                  key={suggestion.id}
                  className={`rounded-md border border-l-4 border-slate-200 bg-white p-3 shadow-sm ${suggestionAccent(
                    suggestion.type,
                  )}`}
                >
                  {reasonBySuggestionId[suggestion.id] && (
                    <p className="mb-2 rounded bg-amber-50 px-2 py-1 text-xs leading-relaxed text-amber-800">
                      {reasonBySuggestionId[suggestion.id]}
                    </p>
                  )}

                  {labels.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {labels.map((label) => (
                        <span
                          key={label}
                          className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-slate-500"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="truncate font-mono text-xs text-slate-900">
                    {getSuggestionPreview(suggestion)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {String(suggestion.userMetadata?.name || suggestion.userId)}{" "}
                    | {new Date(suggestion.createdAt).toLocaleTimeString()}
                  </p>

                  <div className="mt-3 flex gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        editor.commands.acceptSuggestion({ id: suggestion.id })
                      }
                      className={`${buttonClass} flex-1`}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        editor.commands.rejectSuggestion({ id: suggestion.id })
                      }
                      className={`${buttonClass} flex-1`}
                    >
                      Reject
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
