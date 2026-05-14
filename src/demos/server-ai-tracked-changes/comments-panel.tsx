"use client";

import type { Editor } from "@tiptap/react";
import { hoverOffThread, hoverThread } from "@tiptap-pro/extension-comments";
import type { TiptapCollabProvider } from "@tiptap-pro/provider";
import {
  CheckCircle2,
  MessageSquarePlus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { DemoThread } from "./use-demo-threads";

type CommentsPanelProps = {
  editor: Editor;
  provider: TiptapCollabProvider;
  threads: DemoThread[];
  selectedThread: string | null;
  showResolved: boolean;
  onShowResolvedChange: (showResolved: boolean) => void;
  onSelectThread: (threadId: string) => void;
  onCreateThread: () => void;
};

function getCommentAuthor(thread: DemoThread) {
  const firstComment = thread.comments?.[0];
  return (
    firstComment?.data?.userName ||
    firstComment?.data?.name ||
    thread.data?.userName ||
    "Comment"
  );
}

function getCommentPreview(thread: DemoThread) {
  return (
    thread.comments?.find((comment) => comment.content)?.content ||
    thread.data?.suggestionReason ||
    "No comment content."
  );
}

export function CommentsPanel({
  editor,
  provider,
  threads,
  selectedThread,
  showResolved,
  onShowResolvedChange,
  onSelectThread,
  onCreateThread,
}: CommentsPanelProps) {
  const visibleThreads = threads.filter((thread) =>
    showResolved ? Boolean(thread.resolvedAt) : !thread.resolvedAt,
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="space-y-3 border-b border-slate-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">Comments</h2>
            <p className="mt-1 text-xs text-slate-500">
              Discuss selected document ranges.
            </p>
          </div>
          <button
            type="button"
            onClick={onCreateThread}
            disabled={editor.state.selection.empty}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:cursor-default disabled:bg-slate-200 disabled:text-slate-400"
          >
            <MessageSquarePlus size={14} />
            Add
          </button>
        </div>

        <div className="grid grid-cols-2 rounded-md bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => onShowResolvedChange(false)}
            className={`rounded px-2 py-1 text-xs font-medium ${
              !showResolved
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Open
          </button>
          <button
            type="button"
            onClick={() => onShowResolvedChange(true)}
            className={`rounded px-2 py-1 text-xs font-medium ${
              showResolved
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Resolved
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {visibleThreads.length === 0 ? (
          <p className="text-sm italic text-slate-400">No threads.</p>
        ) : (
          <div className="space-y-2">
            {visibleThreads.map((thread) => {
              const active = selectedThread === thread.id;

              return (
                <article
                  key={thread.id}
                  onMouseEnter={() => hoverThread(editor, [thread.id])}
                  onMouseLeave={() => hoverOffThread(editor)}
                  className={`rounded-md border bg-white p-3 shadow-sm ${
                    active
                      ? "border-purple-300 ring-2 ring-purple-100"
                      : "border-slate-200"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectThread(thread.id)}
                    className="block w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {getCommentAuthor(thread)}
                        </p>
                        <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-600">
                          {getCommentPreview(thread)}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase text-slate-500">
                        {thread.resolvedAt ? "Resolved" : "Open"}
                      </span>
                    </div>
                  </button>

                  <div className="mt-3 flex gap-2">
                    {thread.resolvedAt ? (
                      <button
                        type="button"
                        onClick={() =>
                          editor.commands.unresolveThread({ id: thread.id })
                        }
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-slate-100 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
                      >
                        <RotateCcw size={14} />
                        Reopen
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          editor.commands.resolveThread({ id: thread.id })
                        }
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-emerald-500 px-2 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
                      >
                        <CheckCircle2 size={14} />
                        Resolve
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        editor.commands.removeThread({
                          id: thread.id,
                          deleteThread: true,
                        });
                        provider.deleteThread(thread.id);
                      }}
                      className="inline-flex items-center justify-center rounded-md bg-rose-50 px-2 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100"
                      aria-label="Delete thread"
                    >
                      <Trash2 size={14} />
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
