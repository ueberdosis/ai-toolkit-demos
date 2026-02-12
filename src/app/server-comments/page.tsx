"use client";

import { useChat } from "@ai-sdk/react";
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
import { getSchemaAwarenessData } from "@tiptap-pro/server-ai-toolkit";
import { DefaultChatTransport } from "ai";
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
import { getCollabConfig } from "./actions";

export default function Page() {
  const [doc] = useState(() => new Y.Doc());
  const [documentId] = useState(() => `server-comments/${uuid()}`);
  const [provider, setProvider] = useState<TiptapCollabProvider | null>(null);

  const [showUnresolved, setShowUnresolved] = useState(true);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  // biome-ignore lint/suspicious/noExplicitAny: Interop with js file
  const threadsRef = useRef<any[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);

  const user = useUser();

  // Setup provider on mount
  useEffect(() => {
    let collabProvider: TiptapCollabProvider | null = null;

    const setupProvider = async () => {
      try {
        const { token, appId, collabBaseUrl } = await getCollabConfig("user-1", documentId);

        collabProvider = new TiptapCollabProvider({
          ...(collabBaseUrl ? { baseUrl: collabBaseUrl } : { appId }),
          name: documentId,
          token,
          document: doc,
          user: "user-1",
          onOpen() {
            console.log("WebSocket connection opened.");
          },
          onConnect() {
            // Apply initial content
            const initialBinary = fromBase64String(initialContent);
            Y.applyUpdate(doc, initialBinary);
          },
        });

        setProvider(collabProvider);
      } catch (error) {
        console.error("Failed to setup collaboration:", error);
      }
    };

    setupProvider();

    return () => {
      if (collabProvider) {
        collabProvider.destroy();
      }
    };
  }, [documentId, doc]);

  // Only create editor once provider is ready
  const editor = useEditor(
    {
      immediatelyRender: false,
      onSelectionUpdate: ({ editor: currentEditor }) =>
        setSelection(currentEditor.state.selection),
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: doc }),
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
                    (t) => t.id === threadId,
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
    [provider],
  );

  // Update threadsRef when editor is available and handle thread selection
  useEffect(() => {
    if (editor && selectedThread) {
      editor
        .chain()
        .selectThread({ id: selectedThread, updateSelection: false })
        .run();
    }
  }, [editor, selectedThread]);

  const { threads = [], createThread } = useThreads(provider, editor);

  threadsRef.current = threads;

  // Fixes issue: https://github.com/vercel/ai/issues/7819
  const schemaAwarenessData = editor ? getSchemaAwarenessData(editor) : null;
  const schemaAwarenessDataRef = useRef(schemaAwarenessData);
  schemaAwarenessDataRef.current = schemaAwarenessData;

  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/server-comments",
      body: () => ({
        schemaAwarenessData: schemaAwarenessDataRef.current,
        documentId,
      }),
    }),
  });

  const [input, setInput] = useState(
    "Add a comment to the first sentence of the last paragraph, that says 'well done'",
  );

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
      selectedThreads={editor.storage.comments?.focusedThreads ?? []}
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
            <div className="button-group">
              <button
                type="button"
                onClick={createThread}
                disabled={!selection || selection.empty}
              >
                Add comment
              </button>
            </div>
          </div>
          <EditorContent editor={editor} />
        </div>
        <div className="sidebar">
          <h2 className="text-xl font-semibold mb-2">AI Chat Assistant</h2>
          <div className="mb-4">
            {messages?.map((message) => (
              <div key={message.id} className="bg-gray-100 p-4 rounded-lg mb-2">
                <strong className="text-blue-600">{message.role}</strong>
                <br />
                <div className="mt-2 whitespace-pre-wrap">
                  {message.parts
                    .filter((p) => p.type === "text")
                    .map((p) => p.text)
                    .join("\n") || "Loading..."}
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) {
                sendMessage({ text: input });
                setInput("");
              }
            }}
            className="flex gap-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 w-full bg-white min-h-24"
              placeholder="Ask the AI to add comments..."
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </ThreadsProvider>
  );
}
