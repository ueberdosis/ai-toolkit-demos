"use client";

import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";
import { v4 as uuid } from "uuid";
import { ChatSidebar, type Message } from "@/components/chat-sidebar";
import { useStreamToolEditor } from "@/lib/use-stream-tool-editor";

const INITIAL_CONTENT = `<h1>The Quiet Rise of Tiptap</h1>
<p>Three years ago, the idea of building a production rich-text editor from scratch felt like a fringe experiment. Today, kitchen-table prototypes and weekend hacks turn into shippable Tiptap-based editors in days, with extensions composable enough that small teams can match what used to take a full SaaS suite.</p>
<h2>The shift in everyday rhythm</h2>
<p>The most visible change is the disappearance of the editor monolith. Developers compose schemas from individual Tiptap extensions, pull in collaboration cursors, and ship features that once took quarters in a single sprint.</p>
<h2>What comes next</h2>
<p>The future is unlikely to be a single dominant editor framework, nor a return to building straight on raw ProseMirror.</p>`;

export default function Page() {
  const { editor, isLoading, editDocument } = useStreamToolEditor({
    slug: "server-ai-stream-tool-chatbot",
    apiRoute: "/api/server-ai-stream-tool-chatbot",
    initialContent: INITIAL_CONTENT,
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      // `resizable: true` enables the `colwidth` attr on tableCell, used to
      // verify streaming preserves array-valued attrs.
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(
    "Replace the last paragraph with a 2-sentence story about hybrid work culture",
  );

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    const task = input.trim();
    if (!task || isLoading || !editor) return;

    setMessages((prev) => [
      ...prev,
      { id: uuid(), role: "user", parts: [{ type: "text", text: task }] },
    ]);
    setInput("");

    try {
      await editDocument(task);
      setMessages((prev) => [
        ...prev,
        {
          id: uuid(),
          role: "assistant",
          parts: [
            { type: "text", text: "Done. Applied your edit to the document." },
          ],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: uuid(),
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "Something went wrong applying that edit. Please try again.",
            },
          ],
        },
      ]);
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
