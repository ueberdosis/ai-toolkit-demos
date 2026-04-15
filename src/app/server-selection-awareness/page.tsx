"use client";

import { useChat } from "@ai-sdk/react";
import { Collaboration } from "@tiptap/extension-collaboration";
import { Selection } from "@tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TiptapCollabProvider } from "@tiptap-pro/provider";
import {
  getSchemaAwarenessData,
  ServerAiToolkit,
} from "@tiptap-pro/server-ai-toolkit";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";
import { ChatSidebar } from "../../components/chat-sidebar";
import "../selection-awareness/selection.css";
import { getCollabConfig } from "../server-ai-agent-chatbot/actions";

const initialContent = `<h1>Selection-aware server AI agent demo</h1>
<p>Select a sentence or paragraph, then ask the AI to rewrite only that selection. The agent will receive the active selection through the Server AI Toolkit selection workflow before it edits the document.</p>
<p>This paragraph gives you more content to target. Try selecting part of it and ask the agent to translate it, shorten it, or make it more formal without changing the rest of the document.</p>
<p>This final paragraph is here so you can verify that the agent stays focused on the selected content instead of rewriting the full document.</p>
`;

export default function Page() {
  const [doc] = useState(() => new Y.Doc());
  const [documentId] = useState(() => `server-selection-awareness/${uuid()}`);
  const providerRef = useRef<TiptapCollabProvider | null>(null);
  const selectionRangeRef = useRef({ from: 0, to: 0 });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: doc }),
      ServerAiToolkit,
      Selection,
    ],
    onSelectionUpdate: ({ editor: currentEditor }) => {
      selectionRangeRef.current = {
        from: currentEditor.state.selection.from,
        to: currentEditor.state.selection.to,
      };
    },
  });

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
          onConnect() {
            editor?.commands.setContent(initialContent);
            editor?.commands.setTextSelection({ from: 243, to: 291 });
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

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/server-selection-awareness",
    }),
  });

  const [input, setInput] = useState(
    "Translate the selected content to Spanish",
  );

  const isLoading = status !== "ready";

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!editor || !input.trim()) {
      return;
    }

    sendMessage(
      { text: input },
      {
        body: {
          schemaAwarenessData: getSchemaAwarenessData(editor),
          documentId,
          selectionRange: selectionRangeRef.current,
        },
      },
    );
    setInput("");
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
        placeholder="Describe how the selected content should change..."
      />
    </div>
  );
}
