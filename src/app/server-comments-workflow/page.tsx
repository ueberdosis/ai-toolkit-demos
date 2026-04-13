"use client";

import { Collaboration } from "@tiptap/extension-collaboration";
import { CollaborationCaret } from "@tiptap/extension-collaboration-caret";
import Placeholder from "@tiptap/extension-placeholder";
import type { Selection } from "@tiptap/pm/state";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  CommentsKit,
  hoverOffThread,
  hoverThread,
} from "@tiptap-pro/extension-comments";
import { TiptapCollabProvider } from "@tiptap-pro/provider";
import {
  getSchemaAwarenessData,
  ServerAiToolkit,
} from "@tiptap-pro/server-ai-toolkit";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";
import { fromBase64String } from "../../demos/comments/demo-setup";
import { initialContent } from "../../demos/comments/initialContent";
import { ThreadsList } from "../../demos/comments/React/components/ThreadsList.jsx";
import { ThreadsProvider } from "../../demos/comments/React/context.jsx";
import { useThreads } from "../../demos/comments/React/hooks/useThreads.jsx";
import { useUser } from "../../demos/comments/React/hooks/useUser.jsx";
import "../../demos/comments/React/styles.scss";
import "../../demos/comments/style.scss";
import { getCollabConfig } from "../server-comments/actions";

export default function Page() {
  const [doc] = useState(() => new Y.Doc());
  const [documentId] = useState(() => `server-comments-workflow/${uuid()}`);
  const [provider, setProvider] = useState<TiptapCollabProvider | null>(null);
  const [showUnresolved, setShowUnresolved] = useState(true);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [task, setTask] = useState(
    "Add short, example comments suggesting improvements to sentences in this document",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  // biome-ignore lint/suspicious/noExplicitAny: Interop with js files
  const threadsRef = useRef<any[]>([]);

  const user = useUser();

  useEffect(() => {
    let collabProvider: TiptapCollabProvider | null = null;

    const setupProvider = async () => {
      const { token, appId, collabBaseUrl } = await getCollabConfig(
        "user-1",
        documentId,
      );

      collabProvider = new TiptapCollabProvider({
        ...(collabBaseUrl ? { baseUrl: collabBaseUrl } : { appId }),
        name: documentId,
        token,
        document: doc,
        user: "user-1",
        onConnect() {
          const initialBinary = fromBase64String(initialContent);
          Y.applyUpdate(doc, initialBinary);
        },
      });

      setProvider(collabProvider);
    };

    setupProvider();

    return () => {
      collabProvider?.destroy();
    };
  }, [documentId, doc]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      onSelectionUpdate: ({ editor: currentEditor }) =>
        setSelection(currentEditor.state.selection),
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: doc }),
        ServerAiToolkit,
        ...(provider
          ? [
              CollaborationCaret.configure({
                provider,
                user,
              }),
              CommentsKit.configure({
                provider,
                onClickThread: (threadId: string | null) => {
                  const isResolved = threadsRef.current.find(
                    (thread) => thread.id === threadId,
                  )?.resolvedAt;

                  if (!threadId || isResolved) {
                    setSelectedThread(null);
                    return;
                  }

                  setSelectedThread(threadId);
                },
              }),
            ]
          : []),
        Placeholder.configure({
          placeholder: "Write a text to add comments ...",
        }),
      ],
    },
    [provider, user, doc],
  );

  const { threads = [], createThread } = useThreads(provider, editor);
  threadsRef.current = threads;

  useEffect(() => {
    if (editor && selectedThread) {
      editor
        .chain()
        .selectThread({ id: selectedThread, updateSelection: false })
        .run();
    }
  }, [editor, selectedThread]);

  const selectThreadInEditor = useCallback(
    (threadId: string) => {
      editor?.chain().selectThread({ id: threadId }).run();
    },
    [editor],
  );

  const deleteThread = useCallback(
    (threadId: string) => {
      provider?.deleteThread(threadId);
      editor?.commands.removeThread({ id: threadId });
    },
    [editor, provider],
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

  const updateComment = useCallback(
    (
      threadId: string,
      commentId: string,
      content: string,
      metaData: Record<string, string>,
    ) => {
      editor?.commands.updateComment({
        threadId,
        id: commentId,
        content,
        data: metaData,
      });
    },
    [editor],
  );

  const onHoverThread = useCallback(
    (threadId: number) => {
      if (editor) {
        hoverThread(editor, [threadId]);
      }
    },
    [editor],
  );

  const onLeaveThread = useCallback(() => {
    if (editor) {
      hoverOffThread(editor);
    }
  }, [editor]);

  if (!editor || !provider) {
    return null;
  }

  const runWorkflow = async () => {
    setIsLoading(true);
    setResultMessage("");

    try {
      const response = await fetch("/api/server-comments-workflow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId,
          schemaAwarenessData: getSchemaAwarenessData(editor),
          task,
          range: {
            from: 0,
            to: editor.state.doc.content.size,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result: {
        operations: Array<{ success: boolean }>;
      } = await response.json();

      setResultMessage(
        `Applied ${result.operations.filter((operation) => operation.success).length} comment operation(s)`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  // biome-ignore lint/suspicious/noExplicitAny: Interop with js files
  const filteredThreads = threads.filter((thread: any) =>
    showUnresolved ? !thread.resolvedAt : !!thread.resolvedAt,
  );

  return (
    <ThreadsProvider
      // @ts-expect-error Interop with js files
      onClickThread={selectThreadInEditor}
      // @ts-expect-error Interop with js files
      onDeleteThread={deleteThread}
      // @ts-expect-error Interop with js files
      onHoverThread={onHoverThread}
      // @ts-expect-error Interop with js files
      onLeaveThread={onLeaveThread}
      // @ts-expect-error Interop with js files
      onResolveThread={resolveThread}
      // @ts-expect-error Interop with js files
      onUpdateComment={updateComment}
      // @ts-expect-error Interop with js files
      onUnresolveThread={unresolveThread}
      // @ts-expect-error Interop with js files
      selectedThreads={editor.storage.comments?.focusedThreads ?? []}
      // @ts-expect-error Interop with js files
      selectedThread={selectedThread}
      // @ts-expect-error Interop with js files
      setSelectedThread={setSelectedThread}
      threads={threads}
    >
      <div
        className="col-group divide-x divide-gray-200"
        data-viewmode={showUnresolved ? "open" : "resolved"}
      >
        <div className="sidebar">
          <div className="sidebar-options">
            <div className="option-group">
              <div className="label-large">Comments</div>
              <div className="switch-group">
                <label>
                  <input
                    type="radio"
                    name="thread-state"
                    onChange={() => setShowUnresolved(true)}
                    checked={showUnresolved}
                  />
                  Open
                </label>
                <label>
                  <input
                    type="radio"
                    name="thread-state"
                    onChange={() => setShowUnresolved(false)}
                    checked={!showUnresolved}
                  />
                  Resolved
                </label>
              </div>
            </div>
            <ThreadsList provider={provider} threads={filteredThreads} />
          </div>
        </div>
        <div className="main">
          <div className="flex flex-col md:flex-row md:items-start gap-2 border-b border-slate-200 bg-white px-4 py-3">
            <button
              type="button"
              onClick={createThread}
              disabled={!selection || selection.empty}
              className="rounded-lg border-none bg-[var(--gray-2)] text-[var(--black)] px-2.5 py-1.5 text-sm font-medium hover:bg-[var(--gray-3)] disabled:bg-[var(--gray-1)] disabled:text-[var(--gray-4)] transition-all duration-200 md:w-auto whitespace-nowrap"
            >
              Add comment
            </button>
            <textarea
              value={task}
              onChange={(event) => {
                setTask(event.target.value);
                event.target.style.height = "auto";
                event.target.style.height = `${event.target.scrollHeight}px`;
              }}
              placeholder="Enter task for managing comments..."
              rows={1}
              className="flex-1 resize-none border border-[var(--gray-3)] rounded-lg px-3 py-1.5 text-sm focus:border-[var(--purple)] focus:outline-none min-h-16 md:min-h-0"
            />
            <button
              type="button"
              onClick={runWorkflow}
              disabled={isLoading || !task.trim()}
              className="rounded-lg border-none bg-[var(--gray-2)] text-[var(--black)] px-2.5 py-1.5 text-sm font-medium hover:bg-[var(--gray-3)] disabled:bg-[var(--gray-1)] disabled:text-[var(--gray-4)] transition-all duration-200 w-full md:w-auto whitespace-nowrap"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Loader2 className="animate-spin" size={14} />
                  Processing...
                </span>
              ) : (
                "Run Comments Workflow"
              )}
            </button>
          </div>
          {!isLoading && Boolean(resultMessage) && (
            <div className="hint" style={{ margin: "0.75rem 1.5rem 0" }}>
              {resultMessage}
            </div>
          )}
          <EditorContent editor={editor} />
        </div>
      </div>
    </ThreadsProvider>
  );
}
