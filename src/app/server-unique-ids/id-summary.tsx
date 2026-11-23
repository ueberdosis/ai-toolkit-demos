"use client";

import { type Editor, useEditorState } from "@tiptap/react";
import { uniqueIdOptions } from "./unique-id-options";

type IdEntry = {
  id: string | null;
  type: string;
  text: string;
  suggestionType: string | null;
};

type IdStatus = "same" | "new" | "duplicate" | "missing";

const statusClassNames: Record<IdStatus, string> = {
  same: "bg-green-100 text-green-800",
  new: "bg-blue-100 text-blue-800",
  duplicate: "bg-red-100 text-red-800",
  missing: "bg-red-100 text-red-800",
};

/** Returns the configured nodes of the document in order, with their IDs. */
export const collectIds = (editor: Editor): IdEntry[] => {
  const entries: IdEntry[] = [];
  const types: readonly string[] = uniqueIdOptions.types;

  editor.state.doc.descendants((node) => {
    if (!types.includes(node.type.name)) return;
    const id = node.attrs[uniqueIdOptions.attributeName];
    entries.push({
      id: typeof id === "string" ? id : null,
      type: node.type.name,
      text: node.textContent.slice(0, 40),
      suggestionType:
        typeof node.attrs.suggestionType === "string"
          ? node.attrs.suggestionType
          : null,
    });
  });

  return entries;
};

/**
 * Lists the node IDs of the document. Compared with `previousIds`, the IDs before the last AI
 * request, each node is marked as keeping its ID or getting a new one. Missing and duplicate IDs
 * are always flagged.
 */
export function IdSummary({
  editor,
  previousIds,
}: {
  editor: Editor;
  previousIds: ReadonlySet<string> | null;
}) {
  const entries = useEditorState({
    editor,
    selector: ({ editor }) => collectIds(editor),
    equalityFn: (previous, next) =>
      JSON.stringify(previous) === JSON.stringify(next),
  });

  const counts = new Map<string, number>();
  for (const { id } of entries) {
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const getStatus = (id: string | null): IdStatus | null => {
    if (!id) return "missing";
    if ((counts.get(id) ?? 0) > 1) return "duplicate";
    if (!previousIds) return null;
    return previousIds.has(id) ? "same" : "new";
  };
  const statuses = entries.map(({ id }) => getStatus(id));
  const countOf = (status: IdStatus) =>
    statuses.filter((value) => value === status).length;

  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium">
        {entries.length} nodes · {countOf("missing")} without ID ·{" "}
        {countOf("duplicate")} duplicate IDs
      </span>
      <span className="text-xs text-[var(--gray-5)]">
        {previousIds
          ? `Since the last request: ${countOf("same")} same · ${countOf("new")} new`
          : "Send a request to compare the IDs with the ones before it."}
      </span>
      <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto text-xs">
        {entries.map((entry, index) => {
          const status = statuses[index];
          return (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: entries have no stable key, IDs can repeat
              key={index}
              className="rounded bg-[var(--gray-1)] px-2 py-1"
            >
              <div className="flex items-center gap-1">
                <code>{entry.id?.slice(0, 8) ?? "no id"}</code> · {entry.type}
                {entry.suggestionType && ` · ${entry.suggestionType}`}
                {status && (
                  <span
                    className={`ml-auto rounded px-1.5 font-medium ${statusClassNames[status]}`}
                  >
                    {status}
                  </span>
                )}
              </div>
              <div className="truncate text-[var(--gray-5)]">
                {entry.text || "(empty)"}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
