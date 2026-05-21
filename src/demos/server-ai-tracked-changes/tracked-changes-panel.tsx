"use client";

import type { Editor } from "@tiptap/react";
import type { Suggestion } from "@tiptap-pro/extension-tracked-changes";
import { Check, X } from "lucide-react";
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
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">
              Suggestions ({suggestions.length})
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Review pending tracked edits.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => editor.commands.acceptAllSuggestions()}
              disabled={suggestions.length === 0}
              className="rounded-md bg-emerald-500 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-600 disabled:cursor-default disabled:bg-slate-200 disabled:text-slate-400"
            >
              Accept all
            </button>
            <button
              type="button"
              onClick={() => editor.commands.rejectAllSuggestions()}
              disabled={suggestions.length === 0}
              className="rounded-md bg-rose-500 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-rose-600 disabled:cursor-default disabled:bg-slate-200 disabled:text-slate-400"
            >
              Reject all
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
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

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        editor.commands.acceptSuggestion({ id: suggestion.id })
                      }
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-emerald-500 px-2 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
                    >
                      <Check size={14} />
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        editor.commands.rejectSuggestion({ id: suggestion.id })
                      }
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-rose-500 px-2 py-1.5 text-xs font-medium text-white hover:bg-rose-600"
                    >
                      <X size={14} />
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
