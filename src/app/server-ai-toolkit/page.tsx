"use client";

import { useChat } from "@ai-sdk/react";
import { Collaboration } from "@tiptap/extension-collaboration";
import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AiToolkit } from "@tiptap-pro/ai-toolkit";
import { TiptapCollabProvider } from "@tiptap-pro/provider";
import { getSchemaAwarenessData } from "@tiptap-pro/server-ai-toolkit";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { getTiptapCloudCredentials } from "./actions";

const initialContent = `
<p>Excepteur eiusmod et amet in excepteur aliqua ad aliqua proident. Velit dolore sit exercitation. Ex ad proident tempor. Tempor non duis amet proident ex. Consectetur aliqua magna magna adipisicing et ullamco reprehenderit laboris minim. Excepteur dolore veniam ullamco in non velit occaecat ullamco excepteur nostrud labore. Tempor fugiat ad excepteur veniam.</p>
<p>In dolor reprehenderit in commodo nostrud Lorem officia commodo labore culpa. Id consequat culpa deserunt dolore. Do reprehenderit dolor do Lorem. Qui magna veniam enim excepteur sit duis ea voluptate esse excepteur. Lorem officia quis tempor et ipsum nisi. Commodo nisi laboris irure ut velit cupidatat cillum eiusmod aute in irure excepteur exercitation consequat.</p>
<p>Velit incididunt commodo exercitation tempor exercitation. Veniam tempor do cillum culpa dolor eu quis sit culpa est. Minim non velit eiusmod anim nisi cillum ipsum qui officia ut nostrud exercitation commodo. Tempor irure consequat ipsum minim id qui aliqua proident nulla nulla nulla adipisicing consectetur. Qui magna id amet dolore exercitation ullamco cillum. Officia ad et nostrud deserunt dolore qui quis tempor culpa culpa nostrud amet reprehenderit. Reprehenderit duis officia enim in nulla deserunt laboris dolor exercitation velit occaecat eu ullamco irure. Pariatur enim irure reprehenderit consequat id velit est nisi irure sunt.</p>
<p>Ea mollit aliqua quis consequat est eiusmod. Pariatur voluptate dolor veniam ea sint dolor Lorem nulla. Aute Lorem nostrud ex aliqua nisi cillum elit adipisicing ea eiusmod in excepteur dolore quis. Veniam duis consectetur ullamco nisi do anim incididunt eiusmod elit in deserunt voluptate amet labore deserunt. Pariatur excepteur consectetur velit consequat ea ex cupidatat nisi ullamco qui sunt. Aute est commodo culpa laboris nulla ipsum sunt consequat ipsum ea.</p>
<p>Quis ad cillum nisi ut qui culpa velit non cillum amet nulla ut ea ad ipsum. Magna exercitation occaecat ea tempor. Et qui nisi fugiat. Fugiat ea occaecat ea ullamco laborum. Qui cillum sunt Lorem eu cupidatat laboris minim do culpa adipisicing aute nulla qui proident duis. Consectetur ad laboris ad esse magna exercitation aliqua veniam ullamco tempor irure.</p>
`;

const doc = new Y.Doc();

export default function Page() {
  const providerRef = useRef<TiptapCollabProvider | null>(null);

  const editorRef = useRef<Editor | null>(null);

  const connectToCollaboration = useCallback(async () => {
    try {
      const { token, appId } = await getTiptapCloudCredentials();

      // Create or update the provider with the credentials
      if (!providerRef.current) {
        providerRef.current = new TiptapCollabProvider({
          appId,
          token,
          user: "user1",
          name: `tiptap-server-ai-toolkit-1`,
          document: doc,
        });
      }
    } catch (error) {
      console.error("Failed to connect to collaboration:", error);
    }
  }, []);

  useEffect(() => {
    connectToCollaboration();

    return () => {
      // Cleanup provider on unmount
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
    };
  }, [connectToCollaboration]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      AiToolkit,
      Collaboration.configure({
        document: doc,
      }),
    ],
  });

  editorRef.current = editor;

  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/server-ai-toolkit",
      body: () => ({
        schemaAwarenessData: editorRef.current
          ? getSchemaAwarenessData(editorRef.current)
          : null,
      }),
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const [input, setInput] = useState(
    "Replace only the second-to-last paragraph with a short story about Tiptap",
  );

  if (!editor) return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">AI agent chatbot</h1>

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
      <button
        type="button"
        className="bg-gray-200 text-gray-800 px-3 py-1 mt-4 rounded-lg hover:bg-gray-300"
        onClick={() => {
          editorRef.current
            ?.chain()
            .selectAll()
            .insertContent(initialContent)
            .run();
        }}
      >
        Reset content
      </button>
    </div>
  );
}
