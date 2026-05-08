"use client";

import { Collaboration } from "@tiptap/extension-collaboration";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  CommentsKit,
  hoverOffThread,
  hoverThread,
} from "@tiptap-pro/extension-comments";
import {
  findSuggestions,
  TrackedChanges,
} from "@tiptap-pro/extension-tracked-changes";
import { TiptapCollabProvider } from "@tiptap-pro/provider";
import {
  getSchemaAwarenessData,
  ServerAiToolkit,
} from "@tiptap-pro/server-ai-toolkit";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";
import { ThreadsList } from "../../demos/comments/React/components/ThreadsList.jsx";
import { ThreadsProvider } from "../../demos/comments/React/context.jsx";
import { useThreads } from "../../demos/comments/React/hooks/useThreads.jsx";
import { useUser } from "../../demos/comments/React/hooks/useUser.jsx";
import "../../demos/comments/React/styles.scss";
import "../../demos/comments/style.scss";
import "../../styles/tracked-changes.css";
import { getCollabConfig } from "../server-ai-agent-chatbot/actions";

const INITIAL_CONTENT = `<h1>Document Editor Demo</h1>
<p>This is a sample document that can be edited by AI. The text here is informal and could use some improvements.</p>
<p>You can ask the AI to make the text more formal, add more details, simplify it, or transform it in any way you like.</p>
<p>Try different tasks to see how the AI can help you edit your documents!</p>`;

type DemoThread = {
  id: string;
  resolvedAt?: string | null;
  data?: {
    suggestionId?: string;
    suggestionReason?: string;
  };
};

export default function Page() {
  const [isMounted, setIsMounted] = useState(false);
  const [doc] = useState(() => new Y.Doc());
  const [documentId] = useState(
    () => `server-edit-workflow-tracked-comments/${uuid()}`,
  );
  const [provider, setProvider] = useState<TiptapCollabProvider | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    let collabProvider: TiptapCollabProvider | null = null;

    const setupProvider = async () => {
      try {
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
        });

        setProvider(collabProvider);
      } catch (error) {
        console.error("Failed to setup collaboration:", error);
      }
    };

    setupProvider();

    return () => {
      collabProvider?.destroy();
    };
  }, [documentId, doc, isMounted]);

  if (!isMounted) {
    return null;
  }

  if (!provider) {
    return (
      <div className="tracked-changes-comments-demo flex h-screen items-center justify-center bg-white">
        <div className="space-y-2 text-center">
          <div className="label-large">Loading collaboration document</div>
          <p className="label-small text-slate-500">
            Mounting the comments provider before the editor initializes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <EditWorkflowCommentsEditor
      doc={doc}
      documentId={documentId}
      provider={provider}
    />
  );
}

type EditWorkflowCommentsEditorProps = {
  doc: Y.Doc;
  documentId: string;
  provider: TiptapCollabProvider;
};

function EditWorkflowCommentsEditor({
  doc,
  documentId,
  provider,
}: EditWorkflowCommentsEditorProps) {
  const user = useUser();
  const [hasSuggestions, setHasSuggestions] = useState(false);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [task, setTask] = useState(
    "Make the text more formal and professional, but do not change the title",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        undoRedo: false,
      }),
      Collaboration.configure({
        document: doc,
      }),
      ServerAiToolkit,
      TrackedChanges.configure({
        enabled: false,
      }),
      CommentsKit.configure({
        provider,
        onClickThread: (threadId: string | null) => {
          if (!threadId) {
            setSelectedThread(null);
            editor?.chain().unselectThread().run();
            return;
          }

          setSelectedThread(threadId);
          editor
            ?.chain()
            .selectThread({ id: threadId, updateSelection: false })
            .run();
        },
      }),
    ],
    editorProps: {
      attributes: {
        // @ts-expect-error spellcheck is a valid DOM attribute
        spellcheck: false,
      },
    },
  });

  useEffect(() => {
    if (!editor || !provider) {
      return;
    }

    const handleSync = () => {
      if (editor.isEmpty) {
        editor.commands.setContent(INITIAL_CONTENT);
      }
    };

    if (provider.isSynced) {
      handleSync();
    } else {
      provider.on("synced", handleSync);
    }

    return () => {
      provider.off("synced", handleSync);
    };
  }, [editor, provider]);

  const threadsResult = useThreads(provider, editor, user);
  const threads: DemoThread[] = Array.isArray(threadsResult.threads)
    ? threadsResult.threads
    : [];

  useEffect(() => {
    if (!editor) {
      return;
    }

    const updateSuggestionState = () => {
      setHasSuggestions(findSuggestions(editor, "suggestion").length > 0);
    };

    updateSuggestionState();
    editor.on("transaction", updateSuggestionState);

    return () => {
      editor.off("transaction", updateSuggestionState);
    };
  }, [editor]);

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
      if (!editor) {
        return;
      }
      // hoverThread / hoverOffThread read editor history state, which is null
      // when StarterKit's `undoRedo` extension is disabled (the established
      // demo pattern). The hover effect is purely visual, so failures here
      // are safe to swallow.
      try {
        hoverThread(editor, [threadId]);
      } catch {
        // best-effort
      }
    },
    [editor],
  );

  const onLeaveThread = useCallback(() => {
    if (!editor) {
      return;
    }
    try {
      hoverOffThread(editor);
    } catch {
      // best-effort
    }
  }, [editor]);

  if (!editor) {
    return null;
  }

  const editDocument = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(
        "/api/server-edit-workflow-tracked-comments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            documentId,
            schemaAwarenessData: getSchemaAwarenessData(editor),
            task,
            sessionId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result: { sessionId: string } = await response.json();
      setSessionId(result.sessionId);
    } finally {
      setIsLoading(false);
    }
  };

  const openThreads = threads.filter((thread) => !thread.resolvedAt);

  return (
    <ThreadsProvider
      // @ts-expect-error JSX interop with JS comments demo code
      onClickThread={selectThreadInEditor}
      // @ts-expect-error JSX interop with JS comments demo code
      onDeleteThread={deleteThread}
      // @ts-expect-error JSX interop with JS comments demo code
      onHoverThread={onHoverThread}
      // @ts-expect-error JSX interop with JS comments demo code
      onLeaveThread={onLeaveThread}
      // @ts-expect-error JSX interop with JS comments demo code
      onResolveThread={resolveThread}
      // @ts-expect-error JSX interop with JS comments demo code
      onUpdateComment={updateComment}
      // @ts-expect-error JSX interop with JS comments demo code
      onUnresolveThread={unresolveThread}
      // @ts-expect-error JSX interop with JS comments demo code
      selectedThreads={editor.storage.comments?.focusedThreads ?? []}
      // @ts-expect-error JSX interop with JS comments demo code
      selectedThread={selectedThread}
      // @ts-expect-error JSX interop with JS comments demo code
      setSelectedThread={setSelectedThread}
      // @ts-expect-error JSX interop with JS comments demo code
      threads={threads}
    >
      <div className="tracked-changes-comments-demo flex flex-col h-screen">
        <div className="flex flex-col sm:flex-row sm:items-start gap-2 border-b border-slate-200 bg-white px-4 py-3">
          <textarea
            value={task}
            onChange={(event) => {
              setTask(event.target.value);
              event.target.style.height = "auto";
              event.target.style.height = `${event.target.scrollHeight}px`;
            }}
            placeholder="Enter editing task..."
            rows={1}
            className="flex-1 resize-none border border-[var(--gray-3)] rounded-lg px-3 py-1.5 text-sm focus:border-[var(--purple)] focus:outline-none min-h-16 sm:min-h-0"
          />
          {hasSuggestions ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  editor.commands.acceptAllSuggestions();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium bg-[var(--green)] text-white hover:opacity-90 transition-all duration-200 cursor-pointer"
              >
                Accept all
              </button>
              <button
                type="button"
                onClick={() => {
                  editor.commands.rejectAllSuggestions();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium bg-[var(--gray-2)] text-[var(--black)] hover:bg-[var(--gray-3)] transition-all duration-200 cursor-pointer"
              >
                Reject all
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={editDocument}
              disabled={isLoading || !task.trim()}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border-none bg-[var(--gray-2)] text-[var(--black)] px-2.5 py-1.5 text-sm font-medium hover:bg-[var(--gray-3)] disabled:bg-[var(--gray-1)] disabled:text-[var(--gray-4)] transition-all duration-200 cursor-pointer disabled:cursor-not-allowed w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={14} /> Editing...
                </>
              ) : (
                "Edit Document"
              )}
            </button>
          )}
        </div>
        <div
          className="col-group divide-x divide-gray-200 flex-1 overflow-hidden"
          data-viewmode="open"
        >
          <aside className="sidebar border-r border-gray-200 bg-white">
            <div className="space-y-3">
              <div>
                <div className="label-large">Comments</div>
                <p className="label-small mt-1">
                  Each AI edit operation's justification becomes a comment
                  thread linked to its tracked change.
                </p>
              </div>
              <ThreadsList provider={provider} threads={openThreads} />
            </div>
          </aside>

          <div className="main overflow-y-auto">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </ThreadsProvider>
  );
}
