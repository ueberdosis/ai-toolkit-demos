import "./styles.scss";

import { Collaboration } from "@tiptap/extension-collaboration";
import { CollaborationCaret } from "@tiptap/extension-collaboration-caret";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AiToolkit } from "@tiptap-pro/ai-toolkit";
import {
  CommentsKit,
  hoverOffThread,
  hoverThread,
} from "@tiptap-pro/extension-comments";
import { TiptapCollabProvider } from "@tiptap-pro/provider";
import { useCallback, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";
import { fromBase64String } from "../demo-setup.ts";
import { initialContent } from "../initialContent.ts";
import { CommentsAiChatbot } from "./CommentsAiChatbot.jsx";
import { ThreadsList } from "./components/ThreadsList.jsx";
import { ThreadsProvider } from "./context.jsx";
import { NodeViewExtension } from "./extensions.jsx";
import { useThreads } from "./hooks/useThreads.jsx";
import { useUser } from "./hooks/useUser.jsx";

const doc = new Y.Doc();

const provider = new TiptapCollabProvider({
  appId: "7j9y6m10",
  name: `tiptap-comments-demo/${uuid()}`,
  document: doc,
});

// apply initial content
const initialBinary = fromBase64String(initialContent);

Y.applyUpdate(provider.document, initialBinary);

export default () => {
  const [showUnresolved, setShowUnresolved] = useState(true);
  const [selectedThread, setSelectedThread] = useState(null);
  const threadsRef = useRef([]);
  const [selection, setSelection] = useState(null);

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

  if (!editor) {
    return null;
  }

  const filteredThreads = threads.filter((t) =>
    showUnresolved ? !t.resolvedAt : !!t.resolvedAt,
  );

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
                onClick={() => editor.chain().focus().insertNodeView().run()}
              >
                Add node view
              </button>
            </div>
          </div>
          <EditorContent editor={editor} />
        </div>
        <div className="sidebar !p-0">
          <CommentsAiChatbot editor={editor} />
        </div>
      </div>
    </ThreadsProvider>
  );
};
