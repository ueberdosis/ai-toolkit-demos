"use client";

import { Collaboration } from "@tiptap/extension-collaboration";
import { CollaborationCaret } from "@tiptap/extension-collaboration-caret";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { AiToolkit, getAiToolkit, commentsWorkflowOutputSchema } from "@tiptap-pro/ai-toolkit";
import {
  CommentsKit,
  hoverOffThread,
  hoverThread,
} from "@tiptap-pro/extension-comments";
import { TiptapCollabProvider } from "@tiptap-pro/provider";
import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";
import { fromBase64String } from "../../demos/comments/demo-setup.ts";
import { initialContent } from "../../demos/comments/initialContent.ts";
import { ThreadsProvider } from "../../demos/comments/React/context.jsx";
import { NodeViewExtension } from "../../demos/comments/React/extensions.jsx";
import { useThreads } from "../../demos/comments/React/hooks/useThreads.jsx";
import { useUser } from "../../demos/comments/React/hooks/useUser.jsx";
import "../../demos/comments/React/styles.scss";
import "../../demos/style.scss";

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
  const [selectedThread, setSelectedThread] = useState(null);
  const threadsRef = useRef([]);
  const [selection, setSelection] = useState(null);
  const [task, setTask] = useState("Add helpful comments suggesting improvements to this document");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
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
        onClickThread: (threadId) => {
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
      NodeViewExtension,
    ],
    editorProps: {
      attributes: {
        spellcheck: false,
      },
    },
  });

  const { threads = [], createThread } = useThreads(provider, editor, user);

  threadsRef.current = threads;

  const { submit, isLoading, object } = useObject({
    api: "/api/comments-workflow",
    schema: commentsWorkflowOutputSchema,
    onFinish: (result) => {
      if (result.error) {
        setStatus("error");
        setResultMessage("An error occurred while processing comments.");
      } else {
        setStatus("success");
        setResultMessage("Comments processed successfully!");
      }
    },
  });

  const operations = object?.operations ?? [];

  // Apply operations as they arrive
  useEffect(() => {
    if (!editor || operations.length === 0) return;

    const toolkit = getAiToolkit(editor);
    const result = toolkit.editThreadsWorkflow({
      operations,
    });

    if (result.docChanged) {
      setResultMessage(`Applied ${result.operations.length} comment operation(s)`);
    }
  }, [operations, editor]);

  const selectThreadInEditor = useCallback(
    (threadId) => {
      editor.chain().selectThread({ id: threadId }).run();
    },
    [editor],
  );

  const deleteThread = useCallback(
    (threadId) => {
      provider.deleteThread(threadId);
      editor.commands.removeThread({ id: threadId });
    },
    [editor],
  );

  const resolveThread = useCallback(
    (threadId) => {
      editor.commands.resolveThread({ id: threadId });
    },
    [editor],
  );

  const unresolveThread = useCallback(
    (threadId) => {
      editor.commands.unresolveThread({ id: threadId });
    },
    [editor],
  );

  const updateComment = useCallback(
    (threadId, commentId, content, metaData) => {
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
    (threadId) => {
      hoverThread(editor, [threadId]);
    },
    [editor],
  );

  const onLeaveThread = useCallback(() => {
    hoverOffThread(editor);
  }, [editor]);

  const manageComments = () => {
    setStatus("loading");
    setResultMessage("");

    const toolkit = getAiToolkit(editor);

    // Get the document content and existing threads
    const { nodes } = toolkit.tiptapRead();
    const { threads } = toolkit.getThreads();

    // Call the API endpoint to start the workflow
    submit({ nodes, threads, task });
  };

  if (!editor) {
    return null;
  }

  return (
    <ThreadsProvider
      onClickThread={selectThreadInEditor}
      onDeleteThread={deleteThread}
      onHoverThread={onHoverThread}
      onLeaveThread={onLeaveThread}
      onResolveThread={resolveThread}
      onUpdateComment={updateComment}
      onUnresolveThread={unresolveThread}
      selectedThreads={editor.storage.comments.focusedThreads}
      selectedThread={selectedThread}
      setSelectedThread={setSelectedThread}
      threads={threads}
    >
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
              <button
                type="button"
                onClick={() =>
                  editor
                    .chain()
                    .focus()
                    .setImage({ src: "https://placehold.co/800x500" })
                    .run()
                }
              >
                Add image
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().insertNodeView().run()}
              >
                Add node view
              </button>
            </div>
            <div className="button-group" style={{ gap: "0.5rem", alignItems: "center" }}>
              <input
                type="text"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Enter task for managing comments..."
                style={{
                  padding: "0.25rem 0.625rem",
                  borderRadius: "0.375rem",
                  border: "1px solid var(--gray-3)",
                  fontSize: "0.75rem",
                  minWidth: "300px",
                }}
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
        {(status === "success" || status === "error") && resultMessage && (
          <div className={`hint ${status === "error" ? "error" : ""}`} style={{ margin: "0 1.5rem" }}>
            {resultMessage}
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    </ThreadsProvider>
  );
}
