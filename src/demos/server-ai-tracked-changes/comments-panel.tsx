"use client";

import type { Editor } from "@tiptap/react";
import { hoverOffThread, hoverThread } from "@tiptap-pro/extension-comments";
import type { TiptapCollabProvider } from "@tiptap-pro/provider";
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
  const buttonClass =
    "cursor-pointer rounded-lg border-none bg-[var(--gray-2)] px-2.5 py-1.5 text-sm font-medium leading-[1.15] text-[var(--black)] transition-all duration-200 ease-[cubic-bezier(0.65,0.05,0.36,1)] hover:bg-[var(--gray-3)] hover:text-[var(--black-contrast)] disabled:cursor-default disabled:bg-[var(--gray-1)] disabled:text-[var(--gray-4)]";
  const switchButtonClass =
    "flex min-h-6 cursor-pointer items-center justify-center rounded-md px-1.5 text-xs font-medium leading-[1.15] transition-all duration-200 ease-[cubic-bezier(0.65,0.05,0.36,1)]";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="space-y-4 border-b border-slate-200 p-4">
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
            className={buttonClass}
          >
            Add comment
          </button>
        </div>

        <div className="grid grid-cols-2 rounded-lg bg-[var(--gray-2)] p-0.5">
          <button
            type="button"
            onClick={() => onShowResolvedChange(false)}
            className={`${switchButtonClass} ${
              !showResolved
                ? "bg-white text-[var(--black-contrast)]"
                : "text-[var(--gray-5)] hover:text-[var(--black)]"
            }`}
          >
            Open
          </button>
          <button
            type="button"
            onClick={() => onShowResolvedChange(true)}
            className={`${switchButtonClass} ${
              showResolved
                ? "bg-white text-[var(--black-contrast)]"
                : "text-[var(--gray-5)] hover:text-[var(--black)]"
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
                    className="block w-full cursor-pointer text-left"
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

                  <div className="mt-3 flex gap-1">
                    {thread.resolvedAt ? (
                      <button
                        type="button"
                        onClick={() =>
                          editor.commands.unresolveThread({ id: thread.id })
                        }
                        className={`${buttonClass} flex-1`}
                      >
                        Reopen
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          editor.commands.resolveThread({ id: thread.id })
                        }
                        className={`${buttonClass} flex-1`}
                      >
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
                      className={buttonClass}
                    >
                      Delete
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
