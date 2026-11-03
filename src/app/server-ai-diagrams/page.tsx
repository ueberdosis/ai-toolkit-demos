"use client";

import { useChat } from "@ai-sdk/react";
import { getEditorContext, ServerAiToolkit } from "@tiptap/ai-toolkit";
import { Collaboration } from "@tiptap/extension-collaboration";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TiptapCollabProvider } from "@tiptap-pro/provider";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";
import { getCollabConfig } from "@/app/server-ai-agent-chatbot/actions";
import { CopyTestCaseButton } from "@/components/capture-test-case/copy-test-case-button";
import { ChatSidebar } from "../../components/chat-sidebar";
import {
  diagramStyles,
  diagramsExtension,
  diagramsInitialContent,
} from "../../demos/diagrams/diagrams-setup";

export default function Page() {
  const [doc] = useState(() => new Y.Doc());
  const [documentId] = useState(() => `server-ai-diagrams/${uuid()}`);
  const [provider, setProvider] = useState<TiptapCollabProvider | null>(null);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: doc }),
        ServerAiToolkit,
        diagramsExtension,
      ],
    },
    [provider],
  );

  const editorRef = useRef(editor);
  editorRef.current = editor;

  useEffect(() => {
    let cancelled = false;
    let createdProvider: TiptapCollabProvider | null = null;

    const setupProvider = async () => {
      try {
        const { appId, collabBaseUrl } = await getCollabConfig(
          "user-1",
          documentId,
        );
        if (cancelled) return;

        createdProvider = new TiptapCollabProvider({
          ...(collabBaseUrl ? { baseUrl: collabBaseUrl } : { appId }),
          name: documentId,
          token: async () =>
            (await getCollabConfig("user-1", documentId)).token,
          document: doc,
          user: "user-1",
          onConnect() {
            editorRef.current
              ?.chain()
              .setContent(diagramsInitialContent)
              .setMeta("addToHistory", false)
              .run();
          },
        });

        createdProvider.on(
          "authenticationFailed",
          ({ reason }: { reason: unknown }) => {
            console.error("Collaboration authentication failed:", reason);
          },
        );

        setProvider(createdProvider);
      } catch (error) {
        console.error("Failed to setup collaboration:", error);
      }
    };

    setupProvider();

    return () => {
      cancelled = true;
      createdProvider?.destroy();
      setProvider(null);
    };
  }, [documentId, doc]);

  // Fixes issue: https://github.com/vercel/ai/issues/7819
  const editorContext = editor ? getEditorContext(editor) : null;
  const editorContextRef = useRef(editorContext);
  editorContextRef.current = editorContext;

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/server-ai-agent-chatbot",
      body: () => ({
        editorContext: editorContextRef.current,
        documentId,
      }),
    }),
  });

  const [input, setInput] = useState(
    "Add a pie chart of the June revenue and costs after the first paragraph",
  );

  const isLoading = status !== "ready";

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  if (!editor) return null;

  return (
    <div className="flex h-screen">
      <style>{diagramStyles}</style>
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      <ChatSidebar
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        inputAction={
          <CopyTestCaseButton
            editor={editor}
            messages={messages}
            status={status}
          />
        }
      />
    </div>
  );
}
