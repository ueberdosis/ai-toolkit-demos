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
        const { token, appId, collabBaseUrl } = await getCollabConfig("user-1", documentId);

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

  const { messages, sendMessage } = useChat({
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

  if (!editor) return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Server AI agent chatbot</h1>

      <p className="text-sm text-gray-500 pb-4">
        In this demo, the AI edits the collaborative document in the server and
        changes are reflected in the client in real time.
      </p>

      <div className="mb-6">
        <EditorContent
          editor={editor}
          className="border border-gray-300 rounded-lg p-4 min-h-[200px]"
        />
      </div>

      <div className="mb-6 space-y-4">
        {messages?.map((message) => (
          <div key={message.id} className="bg-gray-100 p-4 rounded-lg">
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
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
          placeholder="Ask the AI to improve the document..."
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
        >
          Send
        </button>
      </form>
    </div>
  );
}
