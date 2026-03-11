"use client";

import { useChat } from "@ai-sdk/react";
import { Collaboration } from "@tiptap/extension-collaboration";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AiToolkit, getAiToolkit } from "@tiptap-pro/ai-toolkit";
import {
  CommentsKit,
  hoverOffThread,
  hoverThread,
  subscribeToThreads,
} from "@tiptap-pro/extension-comments";
import {
  findSuggestions,
  TrackedChanges,
} from "@tiptap-pro/extension-tracked-changes";
import { TiptapCollabProvider } from "@tiptap-pro/provider";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";
import { ChatSidebar } from "../../components/chat-sidebar";
import "../../demos/comments/style.scss";
import "../../demos/comments/React/styles.scss";
import "../../styles/tracked-changes.css";

// Y.js doc + collab provider — created once at module level
const doc = new Y.Doc();
const docName = `tracked-changes-comments-demo/${uuid()}`;

const provider = new TiptapCollabProvider({
  appId: "7j9y6m10",
  name: docName,
  document: doc,
});

const INITIAL_CONTENT = `<h1>AI agent demo</h1><p>Ask the AI to improve this document. Changes will appear as tracked changes, and the AI will leave comments explaining each edit.</p>`;

type Thread = {
  id: string;
  resolvedAt?: string | null;
  createdAt: string;
};

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  data: { userName: string };
};

export default function Page() {
  const [hasSuggestions, setHasSuggestions] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const threadsRef = useRef<Thread[]>([]);

  const onClickThread = useCallback((threadId: string | null) => {
    if (!threadId) {
      setSelectedThread(null);
      return;
    }

    const isResolved = threadsRef.current.find(
      (t) => t.id === threadId,
    )?.resolvedAt;

    if (isResolved) {
      setSelectedThread(null);
      return;
    }

    setSelectedThread(threadId);
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        undoRedo: false,
      }),
      Collaboration.configure({
        document: doc,
      }),
      TrackedChanges.configure({ enabled: false }),
      CommentsKit.configure({
        provider,
        onClickThread,
      }),
      AiToolkit,
    ],
  });

  // Set initial content when the Y.js doc is empty (Collaboration overrides the content prop)
  useEffect(() => {
    if (!editor) return;
    if (editor.isEmpty) {
      editor.commands.setContent(INITIAL_CONTENT);
    }
  }, [editor]);

  // Subscribe to threads from the collab provider
  useEffect(() => {
    const unsubscribe = subscribeToThreads({
      provider,
      callback: (currentThreads: Thread[]) => {
        setThreads(currentThreads);
        threadsRef.current = currentThreads;
      },
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Track suggestion count on every transaction
  useEffect(() => {
    if (!editor) return;

    const onTransaction = () => {
      const suggestions = findSuggestions(editor, "suggestion");
      setHasSuggestions(suggestions.length > 0);
    };

    editor.on("transaction", onTransaction);
    return () => {
      editor.off("transaction", onTransaction);
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
        commentsOptions: {
          threadData: { userName: "AI" },
          commentData: { userName: "AI" },
        },
      });

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

  // Thread helper callbacks
  const selectThreadInEditor = useCallback(
    (threadId: string) => {
      editor?.chain().selectThread({ id: threadId }).run();
    },
    [editor],
  );

  const deleteThread = useCallback(
    (threadId: string) => {
      provider.deleteThread(threadId);
      editor?.commands.removeThread({ id: threadId });
    },
    [editor],
  );

  const resolveThread = useCallback(
    (threadId: string) => {
      editor?.commands.resolveThread({ id: threadId });
    },
    [editor],
  );

  const unresolveThread = useCallback(
    (threadId: string) => {
      editor?.commands.unresolveThread({ id: threadId });
    },
    [editor],
  );

  const onHoverThread = useCallback(
    (threadId: string) => {
      if (editor) hoverThread(editor, [threadId]);
    },
    [editor],
  );

  const onLeaveThread = useCallback(() => {
    if (editor) hoverOffThread(editor);
  }, [editor]);

  // Unresolved threads only
  const openThreads = useMemo(
    () => threads.filter((t) => !t.resolvedAt),
    [threads],
  );

  if (!editor) return null;

  return (
    <div className="flex h-screen" data-viewmode="open">
      {/* Left sidebar: comment threads */}
      <aside className="hidden sm:block w-64 lg:w-72 flex-shrink-0 border-r border-slate-200 h-screen overflow-y-auto">
        <div className="p-4">
          <div className="mb-3">
            <span className="text-sm font-semibold text-slate-700">
              Comments
            </span>
            {openThreads.length > 0 && (
              <span className="ml-2 text-xs text-slate-400">
                ({openThreads.length})
              </span>
            )}
          </div>

          {openThreads.length === 0 ? (
            <p className="text-xs text-slate-400">
              No comment threads yet. Ask the AI to edit the document and
              comment threads will appear here.
            </p>
          ) : (
            <div className="threads-group">
              {openThreads.map((thread) => (
                <ThreadItem
                  key={thread.id}
                  thread={thread}
                  provider={provider}
                  isSelected={selectedThread === thread.id}
                  focusedThreads={editor.storage.comments?.focusedThreads ?? []}
                  onClickThread={(id) => {
                    selectThreadInEditor(id);
                    setSelectedThread((prev) => (prev === id ? null : id));
                  }}
                  onHoverThread={onHoverThread}
                  onLeaveThread={onLeaveThread}
                  onResolveThread={resolveThread}
                  onDeleteThread={deleteThread}
                />
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Center: editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Right: chat sidebar */}
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
              Review tracked changes in the document. Comments appear as threads
              in the left sidebar.
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

/**
 * A simplified thread item component for displaying comment threads.
 */
function ThreadItem({
  thread,
  provider,
  isSelected,
  focusedThreads,
  onClickThread,
  onHoverThread,
  onLeaveThread,
  onResolveThread,
  onDeleteThread,
}: {
  thread: Thread;
  provider: TiptapCollabProvider;
  isSelected: boolean;
  focusedThreads: string[];
  onClickThread: (id: string) => void;
  onHoverThread: (id: string) => void;
  onLeaveThread: () => void;
  onResolveThread: (id: string) => void;
  onDeleteThread: (id: string) => void;
}) {
  const comments: Comment[] = useMemo(
    () => provider.getThreadComments(thread.id, true) ?? [],
    [provider, thread],
  );

  const firstComment = comments[0];
  const isActive = isSelected || focusedThreads.includes(thread.id);

  return (
    <div
      onMouseEnter={() => onHoverThread(thread.id)}
      onMouseLeave={() => onLeaveThread()}
    >
      <div
        className={`thread${isSelected ? " is-open" : ""}${isActive ? " is-active" : ""}`}
        onClick={() => onClickThread(thread.id)}
        onKeyDown={() => {}}
        role="button"
        tabIndex={0}
      >
        {isSelected ? (
          <>
            <div className="header-group">
              <div className="button-group">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResolveThread(thread.id);
                  }}
                >
                  Resolve
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteThread(thread.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="comments-group">
              {comments.map((comment) => (
                <div key={comment.id} className="comment">
                  <div className="label-group">
                    <span>{comment.data?.userName ?? "AI"}</span>
                    <span>
                      {new Date(comment.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="comment-content">
                    <p>{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          firstComment && (
            <div className="comments-group">
              <div className="comment">
                <div className="label-group">
                  <span>{firstComment.data?.userName ?? "AI"}</span>
                  <span>
                    {new Date(firstComment.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="comment-content">
                  <p>{firstComment.content}</p>
                </div>
              </div>
              {comments.length > 1 && (
                <div className="comments-count">
                  <span>
                    {comments.length - 1}{" "}
                    {comments.length - 1 === 1 ? "reply" : "replies"}
                  </span>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
