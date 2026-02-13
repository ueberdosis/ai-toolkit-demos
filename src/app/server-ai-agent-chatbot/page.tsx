"use client";

import { useChat } from "@ai-sdk/react";
import { Collaboration } from "@tiptap/extension-collaboration";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TiptapCollabProvider } from "@tiptap-pro/provider";
import { getSchemaAwarenessData } from "@tiptap-pro/server-ai-toolkit";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";
import { ChatSidebar } from "../../components/chat-sidebar";
import { getCollabConfig } from "./actions";

const initialContent = `<h1>AI agent demo</h1>
<p>Reprehenderit id exercitation commodo aliquip magna. Quis sunt proident consectetur magna Lorem nulla. Ullamco in aute proident sit qui nulla voluptate incididunt aliquip nostrud aliqua. Irure veniam ea labore commodo culpa sunt tempor mollit labore dolor eiusmod cupidatat ipsum ullamco. Reprehenderit aliqua est esse ad tempor occaecat occaecat. Laborum et enim incididunt incididunt ipsum anim aliqua consequat amet ex commodo aliqua ipsum id sint. Nulla quis exercitation aute exercitation elit sint in irure proident elit aliqua fugiat.</p>
<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
`;

export default function Page() {
  const [doc] = useState(() => new Y.Doc());
  const [documentId] = useState(() => `server-ai-agent-chatbot/${uuid()}`);
  const providerRef = useRef<TiptapCollabProvider | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: doc }),
    ],
  });

  // Get JWT token and appId from server action
  useEffect(() => {
    const setupProvider = async () => {
      try {
        const { token, appId, collabBaseUrl } = await getCollabConfig(
          "user-1",
          documentId,
        );

        const collabProvider = new TiptapCollabProvider({
          ...(collabBaseUrl ? { baseUrl: collabBaseUrl } : { appId }),
          name: documentId,
          token,
          document: doc,
          user: "user-1",
          onOpen() {
            console.log("WebSocket connection opened.");
          },
          onConnect() {
            editor?.commands.setContent(initialContent);
          },
        });

        providerRef.current = collabProvider;
      } catch (error) {
        console.error("Failed to setup collaboration:", error);
      }
    };

    setupProvider();

    return () => {
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
    };
  }, [documentId, doc, editor]);

  // Fixes issue: https://github.com/vercel/ai/issues/7819
  const schemaAwarenessData = editor ? getSchemaAwarenessData(editor) : null;
  const schemaAwarenessDataRef = useRef(schemaAwarenessData);
  schemaAwarenessDataRef.current = schemaAwarenessData;

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/server-ai-agent-chatbot",
      body: () => ({
        schemaAwarenessData: schemaAwarenessDataRef.current,
        documentId,
      }),
    }),
  });

  const [input, setInput] = useState(
    "Replace the last paragraph with a short story about Tiptap",
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
      />
    </div>
  );
}
