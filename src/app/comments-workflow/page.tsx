"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { Collaboration } from "@tiptap/extension-collaboration";
import { CollaborationCaret } from "@tiptap/extension-collaboration-caret";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AiToolkit,
  editThreadsWorkflowOutputSchema,
  getAiToolkit,
} from "@tiptap-pro/client-ai-toolkit";
import { CommentsKit } from "@tiptap-pro/extension-comments";
import { TiptapCollabProvider } from "@tiptap-pro/provider";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";
import { fromBase64String } from "../../demos/comments/demo-setup";
import { initialContent } from "../../demos/comments/initialContent";
import { useThreads } from "../../demos/comments/React/hooks/useThreads.jsx";
import { useUser } from "../../demos/comments/React/hooks/useUser.jsx";
import { CommentsPanel } from "../../demos/server-ai-tracked-changes/comments-panel";
import "../../demos/server-ai-tracked-changes/server-ai-tracked-changes.css";
import "../../styles/collaboration-caret.css";

const doc = new Y.Doc();

const provider = new TiptapCollabProvider({
  appId: "7j9y6m10",
  name: `tiptap-comments-workflow-demo/${uuid()}`,
  document: doc,
});

// apply initial content
const initialBinary = fromBase64String(initialContent);
Y.applyUpdate(provider.document, initialBinary);

export default function Page() {
  const [activePanel, setActivePanel] = useState<"workflow" | "comments">(
    "workflow",
  );
  const [showResolved, setShowResolved] = useState(false);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  // biome-ignore lint/suspicious/noExplicitAny: Interop with js file
  const threadsRef = useRef<any[]>([]);
  const [, setSelectionVersion] = useState(0);
  const [workflowId, setWorkflowId] = useState("");
  const [task, setTask] = useState(
    "Add short, example comments suggesting improvements to sentences in this document",
  );
  const [resultMessage, setResultMessage] = useState("");

  const user = useUser();

  const editor = useEditor({
    immediatelyRender: false,
    onSelectionUpdate: () => setSelectionVersion((version) => version + 1),
    extensions: [
      AiToolkit,
      StarterKit.configure({
        undoRedo: false,
      }),
      Collaboration.configure({
        document: doc,
      }),
      CollaborationCaret.configure({
        provider,
        user,
      }),
      CommentsKit.configure({
        provider,
        onClickThread: (threadId: string | null) => {
          const isResolved = threadsRef.current.find(
            (t) => t.id === threadId,
          )?.resolvedAt;

          if (!threadId || isResolved) {
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
      Placeholder.configure({
        placeholder: "Write a text to add comments …",
      }),
    ],
    editorProps: {
      attributes: {
        // @ts-expect-error - disable spellcheck
        spellcheck: false,
      },
    },
  });

  const { threads = [], createThread } = useThreads(provider, editor, user);

  threadsRef.current = threads;

  const { submit, isLoading, object } = useObject({
    api: "/api/comments-workflow",
    schema: editThreadsWorkflowOutputSchema,
  });

  useEffect(() => {
    if (!editor || !object?.operations) return;

    const toolkit = getAiToolkit(editor);
    const result = toolkit.editThreadsWorkflow({
      operations: object.operations,
      workflowId,
      isStreaming: isLoading,
    });

    if (!isLoading) {
      setResultMessage(
        `Applied ${result.operations.length} comment operation(s).`,
      );
    }
  }, [editor, object, workflowId, isLoading]);

  const selectThreadInEditor = useCallback(
    (threadId: string) => {
      editor.chain().selectThread({ id: threadId }).run();
    },
    [editor],
  );

  const manageComments = () => {
    const prompt = task.trim();
    if (!prompt || isLoading) return;

    const nextWorkflowId = uuid();
    setWorkflowId(nextWorkflowId);
    setResultMessage("");

    const toolkit = getAiToolkit(editor);

    // Get the document content and existing threads
    const { content } = toolkit.tiptapRead();
    const { threads } = toolkit.getThreads();

    // Call the API endpoint to start the workflow
    submit({ content, threads, task: prompt });
  };

  if (!editor) {
    return null;
  }

  return (
    <div
      className="comments-demo flex h-screen overflow-hidden bg-white"
      data-viewmode={showResolved ? "resolved" : "open"}
    >
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <EditorContent editor={editor} />
        </div>
      </main>
      <aside className="flex h-screen w-[420px] shrink-0 flex-col border-l border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-white p-4">
          <div className="grid grid-cols-2 rounded-lg bg-[var(--gray-2)] p-0.5">
            {(["workflow", "comments"] as const).map((panel) => (
              <button
                key={panel}
                type="button"
                onClick={() => setActivePanel(panel)}
                className={`flex min-h-6 cursor-pointer items-center justify-center rounded-md px-1.5 text-xs font-medium leading-[1.15] capitalize transition-all duration-200 ease-[cubic-bezier(0.65,0.05,0.36,1)] ${
                  activePanel === panel
                    ? "bg-white text-[var(--black-contrast)]"
                    : "text-[var(--gray-5)] hover:text-[var(--black)]"
                }`}
              >
                {panel}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {activePanel === "workflow" && (
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-200 p-4">
                <h2 className="text-sm font-semibold text-slate-950">
                  Comments workflow
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Run the edit-threads workflow against the document and its
                  existing comments.
                </p>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
                <label
                  htmlFor="comments-workflow-task"
                  className="text-sm font-medium text-slate-900"
                >
                  Workflow task
                </label>
                <textarea
                  id="comments-workflow-task"
                  value={task}
                  onChange={(event) => setTask(event.target.value)}
                  placeholder="Describe how the workflow should manage comments..."
                  rows={7}
                  className="w-full resize-none rounded-lg border border-[var(--gray-3)] px-3 py-2 text-sm focus:border-[var(--purple)] focus:outline-none placeholder:text-[var(--gray-4)]"
                />
                <button
                  type="button"
                  onClick={manageComments}
                  disabled={isLoading || !task.trim()}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-[var(--gray-2)] px-4 py-2 text-sm font-medium text-[var(--black)] transition-all duration-200 hover:bg-[var(--gray-3)] hover:text-[var(--black-contrast)] disabled:cursor-default disabled:bg-[var(--gray-1)] disabled:text-[var(--gray-4)]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Running workflow...
                    </>
                  ) : (
                    "Run comments workflow"
                  )}
                </button>

                {resultMessage && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    {resultMessage}
                  </div>
                )}
              </div>
            </div>
          )}

          {activePanel === "comments" && (
            <CommentsPanel
              editor={editor}
              provider={provider}
              threads={threads}
              selectedThread={selectedThread}
              showResolved={showResolved}
              onShowResolvedChange={setShowResolved}
              onSelectThread={selectThreadInEditor}
              onCreateThread={createThread}
            />
          )}
        </div>
      </aside>
    </div>
  );
}
