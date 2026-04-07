"use client";

import { useChat } from "@ai-sdk/react";
import { Collaboration } from "@tiptap/extension-collaboration";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  findSuggestions,
  TrackedChanges,
} from "@tiptap-pro/extension-tracked-changes";
import { TiptapCollabProvider } from "@tiptap-pro/provider";
import {
  getSchemaAwarenessData,
  ServerAiToolkit,
} from "@tiptap-pro/server-ai-toolkit";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";
import { ChatSidebar } from "../../components/chat-sidebar";
import { SuggestionReviewTooltip } from "../../components/suggestion-review-tooltip";
import "../../styles/tracked-changes.css";
import { getCollabConfig } from "../server-ai-agent-chatbot/actions";

const initialTrackedChangesContent =
  "<h1>Tracked changes demo</h1><p>Ask the AI to improve this document. AI edits are written as tracked changes so you can accept or reject them one by one.</p>";

type SuggestionTooltipMount = {
  suggestionId: string;
  element: HTMLElement;
  text: string;
};

export default function Page() {
  const [doc] = useState(() => new Y.Doc());
  const [documentId] = useState(() => `server-ai-tracked-changes/${uuid()}`);
  const [hasSuggestions, setHasSuggestions] = useState(false);
  const [tooltipMount, setTooltipMount] =
    useState<SuggestionTooltipMount | null>(null);
  const providerRef = useRef<TiptapCollabProvider | null>(null);
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const didSetInitialContentRef = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        undoRedo: false,
      }),
      Collaboration.configure({
        document: doc,
      }),
      ServerAiToolkit,
      TrackedChanges.configure({
        enabled: false,
      }),
    ],
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    let collabProvider: TiptapCollabProvider | null = null;

    const setupProvider = async () => {
      try {
        const { token, appId, collabBaseUrl } = await getCollabConfig(
          "user-1",
          documentId,
        );

        collabProvider = new TiptapCollabProvider({
          ...(collabBaseUrl ? { baseUrl: collabBaseUrl } : { appId }),
          name: documentId,
          token,
          document: doc,
          user: "user-1",
          onConnect() {
            if (!didSetInitialContentRef.current) {
              editor.commands.setContent(initialTrackedChangesContent);
              didSetInitialContentRef.current = true;
            }
          },
        });

        providerRef.current = collabProvider;
      } catch (error) {
        console.error("Failed to setup collaboration:", error);
      }
    };

    setupProvider();

    return () => {
      collabProvider?.destroy();
      if (providerRef.current === collabProvider) {
        providerRef.current = null;
      }
    };
  }, [documentId, doc, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

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

  const schemaAwarenessData = editor ? getSchemaAwarenessData(editor) : null;
  const schemaAwarenessDataRef = useRef(schemaAwarenessData);
  schemaAwarenessDataRef.current = schemaAwarenessData;

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/server-ai-tracked-changes",
      body: () => ({
        schemaAwarenessData: schemaAwarenessDataRef.current,
        documentId,
      }),
    }),
  });

  const [input, setInput] = useState(
    "Replace the last paragraph with a short story about Tiptap.",
  );

  const isLoading = status !== "ready";
  const showReviewUi = !isLoading && hasSuggestions;

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();

    if (input.trim()) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="flex h-screen tracked-changes-demo">
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

      <ChatSidebar
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      >
        {showReviewUi && (
          <div className="border-t border-slate-200 p-4 space-y-2">
            <p className="text-xs text-slate-500">
              Review tracked changes in the document.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  editor.commands.acceptAllSuggestions();
                }}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium bg-[var(--green)] text-white hover:opacity-90 transition-all duration-200"
              >
                Accept all
              </button>
              <button
                type="button"
                onClick={() => {
                  editor.commands.rejectAllSuggestions();
                  sendMessage({
                    text: "Some changes were rejected. Ask the user what should be improved before you edit the document again.",
                  });
                }}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium bg-[var(--gray-2)] text-[var(--black)] hover:bg-[var(--gray-3)] transition-all duration-200"
              >
                Reject all
              </button>
            </div>
          </div>
        )}
      </ChatSidebar>
    </div>
  );
}

