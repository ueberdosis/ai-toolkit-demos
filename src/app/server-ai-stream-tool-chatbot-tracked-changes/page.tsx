"use client";

import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TrackedChanges } from "@tiptap-pro/extension-tracked-changes";
import { type FormEvent, useState } from "react";
import { createPortal } from "react-dom";
import { v4 as uuid } from "uuid";
import type { Message } from "@/components/chat-sidebar";
import { SuggestionReviewTooltip } from "@/components/suggestion-review-tooltip";
import type { PanelId } from "@/demos/server-ai-tracked-changes/panel-id";
import { RightSidebar } from "@/demos/server-ai-tracked-changes/right-sidebar";
import { TrackedChangesPanel } from "@/demos/server-ai-tracked-changes/tracked-changes-panel";
import { useStreamToolEditor } from "@/lib/use-stream-tool-editor";
import { useSuggestionReview } from "@/lib/use-suggestion-review";
import "@/styles/tracked-changes.css";

const INITIAL_CONTENT = `<h1>The Quiet Rise of Tiptap</h1>
<p>Three years ago, the idea of building a production rich-text editor from scratch felt like a fringe experiment. Today, kitchen-table prototypes and weekend hacks turn into shippable Tiptap-based editors in days, with extensions composable enough that small teams can match what used to take a full SaaS suite.</p>
<h2>The shift in everyday rhythm</h2>
<p>The most visible change is the disappearance of the editor monolith. Developers compose schemas from individual Tiptap extensions, pull in collaboration cursors, and ship features that once took quarters in a single sprint.</p>
<h2>What comes next</h2>
<p>The future is unlikely to be a single dominant editor framework, nor a return to building straight on raw ProseMirror.</p>`;

export default function Page() {
  const { editor, isLoading, editDocument } = useStreamToolEditor({
    slug: "server-ai-stream-tool-chatbot-tracked-changes",
    apiRoute: "/api/server-ai-stream-tool-chatbot-tracked-changes",
    initialContent: INITIAL_CONTENT,
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      // `resizable: false` keeps the default table render path. With
      // `resizable: true`, prosemirror-tables' columnResizing plugin installs a
      // custom TableView NodeView that bypasses the extension's renderHTML, so a
      // node-level tracked-change suggestion's `data-suggestion-*` attrs never
      // reach the DOM and the table highlight is lost.
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    // Render AI edits as tracked changes. `enabled: false` keeps local typing
    // out of suggestion mode; the AI server writes the suggestion marks/attrs
    // into the Y.Doc and this extension renders them (red = deletion, green =
    // insertion) and powers accept/reject.
    trailingExtensions: [TrackedChanges.configure({ enabled: false })],
  });

  const { suggestions, tooltipMount } = useSuggestionReview(editor);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(
    "Replace the last paragraph with a 2-sentence story about hybrid work culture",
  );
  const [activePanel, setActivePanel] = useState<PanelId>("chat");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const task = input.trim();
    if (!task || isLoading || !editor) return;

    setMessages((prev) => [
      ...prev,
      { id: uuid(), role: "user", parts: [{ type: "text", text: task }] },
    ]);
    setInput("");
    setActivePanel("chat");

    try {
      await editDocument(task);
      setMessages((prev) => [
        ...prev,
        {
          id: uuid(),
          role: "assistant",
          parts: [
            {
              type: "text",
              text: "Applied your edit as tracked changes. Review them in the Tracked changes tab.",
            },
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
        {tooltipMount &&
          createPortal(
            <SuggestionReviewTooltip
              referenceElement={tooltipMount.element}
              text={tooltipMount.text}
              onAccept={() => {
                editor.commands.acceptSuggestion({
                  id: tooltipMount.suggestionId,
                });
              }}
              onReject={() => {
                editor.commands.rejectSuggestion({
                  id: tooltipMount.suggestionId,
                });
              }}
            />,
            tooltipMount.element,
          )}
      </div>
      <RightSidebar
        activePanel={activePanel}
        onActivePanelChange={setActivePanel}
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        trackedPanel={
          <TrackedChangesPanel editor={editor} suggestions={suggestions} />
        }
      />
    </div>
  );
}
