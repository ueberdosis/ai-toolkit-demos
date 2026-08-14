import "./styles.scss";

import { Collaboration } from "@tiptap/extension-collaboration";
import { CollaborationCaret } from "@tiptap/extension-collaboration-caret";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AiToolkit } from "@tiptap-pro/client-ai-toolkit";
import {
  CommentsKit,
  hoverOffThread,
  hoverThread,
} from "@tiptap-pro/extension-comments";
import { TiptapCollabProvider } from "@tiptap-pro/provider";
import { useCallback, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";
import { RightSidebar } from "../../../components/right-sidebar";
import { ToolbarPanel } from "../../../components/toolbar-panel";
import { fromBase64String } from "../demo-setup.ts";
import { initialContent } from "../initialContent.ts";
import { CommentsPanel } from "./components/CommentsPanel.jsx";
import { ThreadsProvider } from "./context.jsx";
import { NodeViewExtension } from "./extensions.jsx";
import { useCommentsChat } from "./hooks/useCommentsChat.jsx";
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
  const [activePanel, setActivePanel] = useState("chat");
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
  const chat = useCommentsChat(editor);

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
        className="flex h-screen overflow-hidden bg-white"
        data-viewmode={showUnresolved ? "open" : "resolved"}
      >
        <main className="flex min-w-0 flex-1 flex-col">
          <ToolbarPanel>
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
          </ToolbarPanel>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <EditorContent editor={editor} />
          </div>
        </main>

        <RightSidebar
          activePanel={activePanel}
          onActivePanelChange={setActivePanel}
          messages={chat.messages}
          input={chat.input}
          onInputChange={chat.setInput}
          onSubmit={chat.handleSubmit}
          isLoading={chat.isLoading}
          placeholder="Ask the AI to add comments..."
          commentsPanel={
            <CommentsPanel
              provider={provider}
              threads={filteredThreads}
              showUnresolved={showUnresolved}
              onShowUnresolvedChange={setShowUnresolved}
            />
          }
        />
      </div>
    </ThreadsProvider>
  );
};
