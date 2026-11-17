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
import { CopyTestCaseButton } from "@/components/capture-test-case/copy-test-case-button";
import { ChatSidebar } from "../../components/chat-sidebar";
import { getCollabConfig } from "../server-ai-agent-chatbot/actions";
import "./content-protection.css";
import { ProtectionAttribute } from "./protection-attribute";

const initialContent = `<h1>Service agreement</h1>
<p>This agreement describes the services that Acme Inc. provides to the customer, starting on January 1st.</p>
<p data-protection="locked">Liability: Acme Inc. is not liable for indirect damages. This clause was approved by the legal team.</p>
<p data-protection="hidden">Internal note: the customer accepted a discount of up to 18%. Don't share this with the customer.</p>
<p>The services include onboarding, monthly reports and priority support during business hours.</p>
<p>Next steps: the customer signs the agreement and schedules the onboarding call.</p>
`;

export default function Page() {
  const [doc] = useState(() => new Y.Doc());
  const [documentId] = useState(() => `server-content-protection/${uuid()}`);
  const [provider, setProvider] = useState<TiptapCollabProvider | null>(null);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: doc }),
        ServerAiToolkit,
        ProtectionAttribute,
      ],
    },
    [provider],
  );

  const editorRef = useRef(editor);
  editorRef.current = editor;

  // Get JWT token and appId from server action
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
            // Seed outside the undo history so undo can't reach an inconsistent state after an AI edit.
            editorRef.current
              ?.chain()
              .setContent(initialContent)
              .setMeta("addToHistory", false)
              .run();
          },
        });

        createdProvider.on("synced", () => {
          console.log("Collaboration document synced.");
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
      api: "/api/server-content-protection",
      body: () => ({
        editorContext: editorContextRef.current,
        documentId,
      }),
    }),
  });

  const [input, setInput] = useState(
    "Rewrite the whole agreement in a friendlier tone and tell me the discount",
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
