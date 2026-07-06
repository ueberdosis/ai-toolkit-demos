"use client";

import { useChat } from "@ai-sdk/react";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { EditorContent } from "@tiptap/react";
import { getEditorContext } from "@tiptap/server-ai-toolkit";
import StarterKit from "@tiptap/starter-kit";
import { TrackedChanges } from "@tiptap-pro/extension-tracked-changes";
import { DefaultChatTransport } from "ai";
import { type FormEvent, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  // The hook owns the Y.Doc, collab provider, editor, and the AI cursor.
  const { editor, documentId } = useStreamToolEditor({
    slug: "server-ai-stream-tool-chatbot-tracked-changes",
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

  // editorContext for the route, kept in a ref (AI SDK stale-closure, vercel/ai#7819).
  const editorContext = editor ? getEditorContext(editor) : null;
  const editorContextRef = useRef(editorContext);
  editorContextRef.current = editorContext;

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/server-ai-stream-tool-chatbot-tracked-changes",
      body: () => ({
        editorContext: editorContextRef.current,
        documentId,
      }),
    }),
  });

  const [input, setInput] = useState(
    "Replace the last paragraph with a 2-sentence story about hybrid work culture",
  );
  const [activePanel, setActivePanel] = useState<PanelId>("chat");

  const isLoading = status !== "ready";

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage({ text: input });
      setInput("");
      setActivePanel("chat");
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
