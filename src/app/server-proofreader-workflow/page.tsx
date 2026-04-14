"use client";

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
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";
import { ToolbarPanel } from "../../components/toolbar-panel";
import "../../styles/tracked-changes.css";
import { getCollabConfig } from "../server-ai-agent-chatbot/actions";

const INITIAL_CONTENT = `<h1>Grammar Check Demo</h1>
<p>This is a excelent editor for writng documents. It have many feature's that makes it very powerfull.
Users can easyly create content, but sometimes they makes small mistake's that are hard to notice.
The tool also help you to edit faster and more effeciently, althou it not always perfect.
Its interface are simple, but it contain option's that may confuse new user's at first.</p>`;

export default function Page() {
  const [doc] = useState(() => new Y.Doc());
  const [documentId] = useState(() => `server-proofreader-workflow/${uuid()}`);
  const providerRef = useRef<TiptapCollabProvider | null>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        undoRedo: false,
      }),
      Collaboration.configure({ document: doc }),
      ServerAiToolkit,
      TrackedChanges.configure({
        enabled: false,
      }),
    ],
  });
  const [hasSuggestions, setHasSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

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
            editor?.commands.setContent(INITIAL_CONTENT);
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
  }, [doc, documentId, editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const updateSuggestionState = () => {
      setHasSuggestions(findSuggestions(editor, "suggestion").length > 0);
    };

    updateSuggestionState();
    editor.on("transaction", updateSuggestionState);

    return () => {
      editor.off("transaction", updateSuggestionState);
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  const runProofreader = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/server-proofreader-workflow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId,
          schemaAwarenessData: getSchemaAwarenessData(editor),
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result: { sessionId: string } = await response.json();
      setSessionId(result.sessionId);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen tracked-changes-demo">
      <ToolbarPanel>
        {!hasSuggestions ? (
          <button
            type="button"
            onClick={runProofreader}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border-none bg-[var(--gray-2)] text-[var(--black)] px-2.5 py-1.5 text-sm font-medium hover:bg-[var(--gray-3)] disabled:bg-[var(--gray-1)] disabled:text-[var(--gray-4)] transition-all duration-200 cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={14} /> Checking...
              </>
            ) : (
              "Check Grammar"
            )}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                editor.commands.acceptAllSuggestions();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium bg-[var(--green)] text-white hover:opacity-90 transition-all duration-200 cursor-pointer"
            >
              Accept all
            </button>
            <button
              type="button"
              onClick={() => {
                editor.commands.rejectAllSuggestions();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium bg-[var(--gray-2)] text-[var(--black)] hover:bg-[var(--gray-3)] transition-all duration-200 cursor-pointer"
            >
              Reject all
            </button>
          </>
        )}
      </ToolbarPanel>
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
