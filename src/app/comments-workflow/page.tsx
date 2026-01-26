"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { Collaboration } from "@tiptap/extension-collaboration";
import { CollaborationCaret } from "@tiptap/extension-collaboration-caret";
import Placeholder from "@tiptap/extension-placeholder";
import type { Selection } from "@tiptap/pm/state";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AiToolkit,
  editThreadsWorkflowOutputSchema,
  getAiToolkit,
} from "@tiptap-pro/ai-toolkit";
import {
  CommentsKit,
  hoverOffThread,
  hoverThread,
} from "@tiptap-pro/extension-comments";
import { TiptapCollabProvider } from "@tiptap-pro/provider";
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
import "./comments-workflow.css";

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
  const [showUnresolved, setShowUnresolved] = useState(true);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  // biome-ignore lint/suspicious/noExplicitAny: Interop with js file
  const threadsRef = useRef<any[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [workflowId, setWorkflowId] = useState("");
  const [task, setTask] = useState(
    "Add short, example comments suggesting improvements to sentences in this document",
  );
  const [resultMessage, setResultMessage] = useState("");

  const user = useUser();

  const editor = useEditor({
    immediatelyRender: false,
    onSelectionUpdate: ({ editor: currentEditor }) =>
      setSelection(currentEditor.state.selection),
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
        user: {
          name: user.name,
          color: user.color,
        },
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
  const editorRef = useRef(editor);
  editorRef.current = editor;

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
        `Applied ${result.operations.length} comment operation(s)`,
      );
    }
  }, [editor, object, workflowId, isLoading]);

  const selectThreadInEditor = useCallback(
    (threadId: string) => {
      editor.chain().selectThread({ id: threadId }).run();
    },
    [editor],
  );

  const deleteThread = useCallback(
    (threadId: string) => {
      provider.deleteThread(threadId);
      editor.commands.removeThread({ id: threadId });
    },
    [editor],
  );

  const resolveThread = useCallback(
    (threadId: string) => {
      editor.commands.resolveThread({ id: threadId });
    },
    [editor],
  );

  const unresolveThread = useCallback(
    (threadId: string) => {
      editor.commands.unresolveThread({ id: threadId });
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
      editor.commands.updateComment({
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
      hoverThread(editor, [threadId]);
    },
    [editor],
  );

  const onLeaveThread = useCallback(() => {
    hoverOffThread(editor);
  }, [editor]);

  const manageComments = () => {
    setWorkflowId(uuid());
    setResultMessage("");

    const toolkit = getAiToolkit(editor);

    // Get the document content and existing threads
    const { content } = toolkit.tiptapRead();
    const { threads } = toolkit.getThreads();

    // Call the API endpoint to start the workflow
    submit({ content, threads, task });
  };

  if (!editor) {
    return null;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Interop with js file
  const filteredThreads = threads.filter((t: any) =>
    showUnresolved ? !t.resolvedAt : !!t.resolvedAt,
  );

  return (
    <ThreadsProvider
      // @ts-expect-error - Interop with js file
      onClickThread={selectThreadInEditor}
      // @ts-expect-error - Interop with js file
      onDeleteThread={deleteThread}
      // @ts-expect-error - Interop with js file
      onHoverThread={onHoverThread}
      // @ts-expect-error - Interop with js file
      onLeaveThread={onLeaveThread}
      // @ts-expect-error - Interop with js file
      onResolveThread={resolveThread}
      // @ts-expect-error - Interop with js file
      onUpdateComment={updateComment}
      // @ts-expect-error - Interop with js file
      onUnresolveThread={unresolveThread}
      // @ts-expect-error - Interop with js file
      selectedThreads={editor.storage.comments.focusedThreads}
      // @ts-expect-error - Interop with js file
      selectedThread={selectedThread}
      // @ts-expect-error - Interop with js file
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
          <div className="control-group">
            <div className="flex-row">
              <div className="button-group">
                <button
                  type="button"
                  onClick={createThread}
                  disabled={!selection || selection.empty}
                >
                  Add comment
                </button>
              </div>
              <div
                className="button-group"
                style={{ gap: "0.5rem", alignItems: "center" }}
              >
                <input
                  type="text"
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="Enter task for managing comments..."
                  className="task-input"
                />
                <button
                  type="button"
                  onClick={manageComments}
                  disabled={isLoading || !task.trim()}
                  className={isLoading || !task.trim() ? "" : "is-active"}
                >
                  {isLoading ? "Processing..." : "Run Comments Workflow"}
                </button>
              </div>
            </div>
          </div>
          {!isLoading && Boolean(resultMessage) && (
            <div className={`hint`} style={{ margin: "0 1.5rem" }}>
              {resultMessage}
            </div>
          )}
          <EditorContent editor={editor} />
        </div>
      </div>
    </ThreadsProvider>
  );
}
