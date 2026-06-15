"use client";

import { Collaboration } from "@tiptap/extension-collaboration";
import { CollaborationCaret } from "@tiptap/extension-collaboration-caret";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  getSchemaAwarenessData,
  ServerAiToolkit,
} from "@tiptap/server-ai-toolkit";
import StarterKit from "@tiptap/starter-kit";
import {
  findSuggestions,
  TrackedChanges,
} from "@tiptap-pro/extension-tracked-changes";
import { TiptapCollabProvider } from "@tiptap-pro/provider";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";
import { SuggestionReviewTooltip } from "../../components/suggestion-review-tooltip";
import "../../styles/tracked-changes.css";
import { getCollabConfig } from "../server-ai-agent-chatbot/actions";

const INITIAL_CONTENT = `<h1>The Quiet Rise of Tiptap</h1>
<p>Three years ago, the idea of building a production rich-text editor from scratch felt like a fringe experiment. Today, kitchen-table prototypes and weekend hacks turn into shippable Tiptap-based editors in days, with extensions composable enough that small teams can match what used to take a full SaaS suite.</p>
<h2>The shift in everyday rhythm</h2>
<p>The most visible change is the disappearance of the editor monolith. Developers compose schemas from individual Tiptap extensions, pull in collaboration cursors, and ship features that once took quarters in a single sprint.</p>
<h2>What comes next</h2>
<p>The future is unlikely to be a single dominant editor framework, nor a return to building straight on raw ProseMirror.</p>`;

type SuggestionTooltipMount = {
  suggestionId: string;
  element: HTMLElement;
  text: string;
};

export default function Page() {
  const [doc] = useState(() => new Y.Doc());
  const [documentId] = useState(
    () => `server-ai-stream-tool-chatbot-tracked-changes/${uuid()}`,
  );
  const [provider, setProvider] = useState<TiptapCollabProvider | null>(null);
  const [task, setTask] = useState(
    "Replace the last paragraph with a 2-sentence story about hybrid work culture",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasSuggestions, setHasSuggestions] = useState(false);
  const [tooltipMount, setTooltipMount] =
    useState<SuggestionTooltipMount | null>(null);
  const anchorRef = useRef<HTMLSpanElement | null>(null);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        // `resizable: false` keeps the default table render path. With
        // `resizable: true`, prosemirror-tables' columnResizing plugin installs a
        // custom `TableView` NodeView that bypasses the extension's `renderHTML`,
        // so a node-level tracked-change suggestion's `data-suggestion-*` attrs
        // never reach the DOM and the table highlight is lost.
        Table.configure({ resizable: false }),
        TableRow,
        TableHeader,
        TableCell,
        Collaboration.configure({ document: doc }),
        ...(provider
          ? [
              CollaborationCaret.configure({
                provider,
                user: { name: "You", color: "#0EA5E9" },
                // Inline-styled caret so the demo doesn't depend on the
                // extension's stylesheet shipping with the demo build.
                render: (user) => {
                  const cursor = document.createElement("span");
                  cursor.style.cssText = `
                    border-left: 2px solid ${user.color};
                    border-right: 2px solid ${user.color};
                    margin-left: -1px;
                    margin-right: -1px;
                    pointer-events: none;
                    position: relative;
                    word-break: normal;
                    height: 1em;
                    display: inline-block;
                    vertical-align: text-bottom;
                  `;
                  const label = document.createElement("div");
                  label.style.cssText = `
                    background-color: ${user.color};
                    border-radius: 3px 3px 3px 0;
                    color: white;
                    font-size: 12px;
                    font-weight: 600;
                    left: -2px;
                    line-height: normal;
                    padding: 1px 4px;
                    position: absolute;
                    top: -1.4em;
                    user-select: none;
                    white-space: nowrap;
                  `;
                  label.textContent = user.name as string;
                  cursor.appendChild(label);
                  return cursor;
                },
              }),
            ]
          : []),
        ServerAiToolkit,
        // Render AI edits as tracked changes. `enabled: false` keeps local
        // typing out of suggestion mode; the AI server writes the suggestion
        // marks/attrs directly into the Y.Doc and this extension renders them
        // (red = deletion, green = insertion) and powers accept/reject.
        TrackedChanges.configure({ enabled: false }),
      ],
    },
    [provider],
  );

  // Capture editor in a ref so the provider effect doesn't tear down the
  // websocket every time the editor instance recreates after `provider`
  // changes.
  const editorRef = useRef(editor);
  editorRef.current = editor;

  useEffect(() => {
    let cancelled = false;
    let createdProvider: TiptapCollabProvider | null = null;

    const setupProvider = async () => {
      try {
        const { token, appId, collabBaseUrl } = await getCollabConfig(
          "user-1",
          documentId,
        );
        if (cancelled) return;
        createdProvider = new TiptapCollabProvider({
          ...(collabBaseUrl ? { baseUrl: collabBaseUrl } : { appId }),
          name: documentId,
          token,
          document: doc,
          user: "user-1",
          onConnect() {
            editorRef.current?.commands.setContent(INITIAL_CONTENT);
          },
        });
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

  // Track suggestions in the document and position the per-suggestion
  // accept/reject tooltip. Mirrors the `server-ai-tracked-changes` demo.
  useEffect(() => {
    if (!editor) return;

    const updateSuggestionState = () => {
      setHasSuggestions(findSuggestions(editor, "suggestion").length > 0);
    };

    const updateTooltip = () => {
      const { from } = editor.state.selection;
      const selectedSuggestion = findSuggestions(editor, "suggestion").find(
        (suggestion) => from >= suggestion.from && from <= suggestion.to,
      );

      if (!selectedSuggestion) {
        setTooltipMount(null);
        return;
      }

      const coords = editor.view.coordsAtPos(selectedSuggestion.to);

      if (!anchorRef.current) {
        anchorRef.current = document.createElement("span");
        anchorRef.current.style.cssText =
          "position: fixed; width: 1px; height: 1px; pointer-events: none;";
        document.body.appendChild(anchorRef.current);
      }

      anchorRef.current.style.left = `${coords.left}px`;
      anchorRef.current.style.top = `${coords.top}px`;

      setTooltipMount({
        suggestionId: selectedSuggestion.id,
        element: anchorRef.current,
        text: "Review this tracked change",
      });
    };

    updateSuggestionState();
    updateTooltip();

    editor.on("transaction", updateSuggestionState);
    editor.on("selectionUpdate", updateTooltip);

    return () => {
      editor.off("transaction", updateSuggestionState);
      editor.off("selectionUpdate", updateTooltip);
      anchorRef.current?.remove();
      anchorRef.current = null;
    };
  }, [editor]);

  const editDocument = async () => {
    if (!editor || !provider) return;
    setIsLoading(true);

    try {
      const response = await fetch(
        "/api/server-ai-stream-tool-chatbot-tracked-changes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task: task.trim(),
            schemaAwarenessData: getSchemaAwarenessData(editor),
            documentId,
            userId: "ai-assistant",
          }),
        },
      );

      if (!response.ok || !response.body) {
        throw new Error(`HTTP error ${response.status}`);
      }

      // Drain the NDJSON response to keep the connection open until the AI
      // server signals completion. The editor updates via the Collaboration
      // extension's Y.Doc sync as the server applies each StreamAction — the
      // streamed suggestion marks render as red (old) and green (new).
      const reader = response.body.getReader();
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    } catch (error) {
      console.error("Stream edit failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!editor) return null;

  const showReviewUi = !isLoading && hasSuggestions;

  return (
    <div className="flex flex-col h-screen">
      <div className="flex flex-col sm:flex-row sm:items-start gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <textarea
          value={task}
          onChange={(event) => {
            setTask(event.target.value);
            event.target.style.height = "auto";
            event.target.style.height = `${event.target.scrollHeight}px`;
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (!isLoading && task.trim() && provider) {
                editDocument();
              }
            }
          }}
          placeholder="Enter editing task... (Shift+Enter for new line)"
          rows={1}
          className="flex-1 resize-none border border-[var(--gray-3)] rounded-lg px-3 py-1.5 text-sm focus:border-[var(--purple)] focus:outline-none min-h-16 sm:min-h-0"
        />
        <button
          type="button"
          onClick={editDocument}
          disabled={isLoading || !task.trim() || !provider}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border-none bg-[var(--gray-2)] text-[var(--black)] px-2.5 py-1.5 text-sm font-medium hover:bg-[var(--gray-3)] disabled:bg-[var(--gray-1)] disabled:text-[var(--gray-4)] transition-all duration-200 cursor-pointer disabled:cursor-not-allowed w-full sm:w-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={14} /> Streaming...
            </>
          ) : (
            "Edit Document"
          )}
        </button>
        {showReviewUi && (
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                editor.commands.acceptAllSuggestions();
              }}
              className="flex-1 sm:flex-none rounded-lg px-3 py-1.5 text-sm font-medium bg-[var(--green)] text-white hover:opacity-90 transition-all duration-200"
            >
              Accept all
            </button>
            <button
              type="button"
              onClick={() => {
                editor.commands.rejectAllSuggestions();
              }}
              className="flex-1 sm:flex-none rounded-lg px-3 py-1.5 text-sm font-medium bg-[var(--gray-2)] text-[var(--black)] hover:bg-[var(--gray-3)] transition-all duration-200"
            >
              Reject all
            </button>
          </div>
        )}
      </div>
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
    </div>
  );
}
