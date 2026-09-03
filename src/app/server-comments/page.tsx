"use client";

import { useChat } from "@ai-sdk/react";
import { getEditorContext, ServerAiToolkit } from "@tiptap/ai-toolkit";
import { Collaboration } from "@tiptap/extension-collaboration";
import { CollaborationCaret } from "@tiptap/extension-collaboration-caret";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  CommentsKit,
  hoverOffThread,
  hoverThread,
} from "@tiptap-pro/extension-comments";
import { TiptapCollabProvider } from "@tiptap-pro/provider";
import { DefaultChatTransport } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";
import { CopyTestCaseButton } from "@/components/capture-test-case/copy-test-case-button";
import { fromBase64String } from "../../demos/comments/demo-setup";
import { initialContent } from "../../demos/comments/initialContent";
import { ThreadsProvider } from "../../demos/comments/React/context.jsx";
import { useThreads } from "../../demos/comments/React/hooks/useThreads.jsx";
import { useUser } from "../../demos/comments/React/hooks/useUser.jsx";
import { CommentsPanel } from "../../demos/server-ai-tracked-changes/comments-panel";
import type { PanelId } from "../../demos/server-ai-tracked-changes/panel-id";
import { RightSidebar } from "../../demos/server-ai-tracked-changes/right-sidebar";
import "../../demos/server-ai-tracked-changes/server-ai-tracked-changes.css";
import { getCollabConfig } from "./actions";

export default function Page() {
  const [doc] = useState(() => new Y.Doc());
  const [documentId] = useState(() => `server-comments/${uuid()}`);
  const [provider, setProvider] = useState<TiptapCollabProvider | null>(null);

  const [showUnresolved, setShowUnresolved] = useState(true);
  const [activePanel, setActivePanel] = useState<PanelId>("chat");
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  // biome-ignore lint/suspicious/noExplicitAny: Interop with js file
  const threadsRef = useRef<any[]>([]);

  const user = useUser();

  // Setup provider on mount
  useEffect(() => {
    let collabProvider: TiptapCollabProvider | null = null;

    const setupProvider = async () => {
      try {
        const { appId, collabBaseUrl } = await getCollabConfig(
          "user-1",
          documentId,
        );

        collabProvider = new TiptapCollabProvider({
          ...(collabBaseUrl ? { baseUrl: collabBaseUrl } : { appId }),
          name: documentId,
          // Pass the token as a function so the provider mints a fresh JWT on
          // every reconnect; a static string freezes at its 30-min expiry and
          // loops on permission-denied after a reconnect.
          token: async () =>
            (await getCollabConfig("user-1", documentId)).token,
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

  const { threads = [], createThread } = useThreads(provider, editor, user);

  threadsRef.current = threads;

  // Fixes issue: https://github.com/vercel/ai/issues/7819
  const editorContext = editor ? getEditorContext(editor) : null;
  const editorContextRef = useRef(editorContext);
  editorContextRef.current = editorContext;

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/server-comments",
      body: () => ({
        editorContext: editorContextRef.current,
        documentId,
      }),
    }),
  });

  const [input, setInput] = useState(
    "Add a comment to the first sentence of the last paragraph, that says 'well done'",
  );

  const isLoading = status !== "ready";

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput("");
    }
  };

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
        className="comments-demo flex h-screen overflow-hidden bg-white"
        data-viewmode={showUnresolved ? "open" : "resolved"}
      >
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <EditorContent editor={editor} />
          </div>
        </main>
        <RightSidebar
          activePanel={activePanel}
          onActivePanelChange={setActivePanel}
          messages={messages}
          input={input}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          commentsPanel={
            <CommentsPanel
              editor={editor}
              provider={provider}
              threads={threads}
              selectedThread={selectedThread}
              showResolved={!showUnresolved}
              onShowResolvedChange={(showResolved) =>
                setShowUnresolved(!showResolved)
              }
              onSelectThread={selectThreadInEditor}
              onCreateThread={createThread}
            />
          }
          inputAction={
            <CopyTestCaseButton
              editor={editor}
              messages={messages}
              status={status}
            />
          }
        />
      </div>
    </ThreadsProvider>
  );
}
