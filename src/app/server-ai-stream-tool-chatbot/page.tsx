"use client";

import { useChat } from "@ai-sdk/react";
import { getEditorContext } from "@tiptap/ai-toolkit";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { DefaultChatTransport } from "ai";
import { useRef, useState } from "react";
import { ChatSidebar } from "@/components/chat-sidebar";
import { useStreamToolEditor } from "@/lib/use-stream-tool-editor";

const INITIAL_CONTENT = `<h1>The Quiet Rise of Tiptap</h1>
<p>Three years ago, the idea of building a production rich-text editor from scratch felt like a fringe experiment. Today, kitchen-table prototypes and weekend hacks turn into shippable Tiptap-based editors in days, with extensions composable enough that small teams can match what used to take a full SaaS suite.</p>
<h2>The shift in everyday rhythm</h2>
<p>The most visible change is the disappearance of the editor monolith. Developers compose schemas from individual Tiptap extensions, pull in collaboration cursors, and ship features that once took quarters in a single sprint.</p>
<h2>What comes next</h2>
<p>The future is unlikely to be a single dominant editor framework, nor a return to building straight on raw ProseMirror.</p>`;

export default function Page() {
  // The hook owns the Y.Doc, collab provider, editor, and the AI cursor
  // (CollaborationCaret). We only swap the chat over to `useChat`.
  const { editor, documentId } = useStreamToolEditor({
    slug: "server-ai-stream-tool-chatbot",
    initialContent: INITIAL_CONTENT,
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
  });

  // editorContext for the route, kept in a ref (AI SDK stale-closure, vercel/ai#7819).
  const editorContext = editor ? getEditorContext(editor) : null;
  const editorContextRef = useRef(editorContext);
  editorContextRef.current = editorContext;

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/server-ai-stream-tool-chatbot",
      body: () => ({
        editorContext: editorContextRef.current,
        documentId,
      }),
    }),
  });

  const [input, setInput] = useState(
    "Replace the last paragraph with a 2-sentence story about hybrid work culture",
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
        placeholder="Ask the AI to edit the document..."
      />
    </div>
  );
}
