"use client";

import { Collaboration } from "@tiptap/extension-collaboration";
import { Selection } from "@tiptap/extensions";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
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
import "../insert-content-workflow/selection.css";
import { getCollabConfig } from "../server-ai-agent-chatbot/actions";

export default function Page() {
  const [doc] = useState(() => new Y.Doc());
  const [documentId] = useState(
    () => `server-insert-content-workflow/${uuid()}`,
  );
  const providerRef = useRef<TiptapCollabProvider | null>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: doc }),
      ServerAiToolkit,
      Selection,
    ],
  });
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
            editor?.commands.setContent(`<p>Select some text and click the "Add emojis" button to add emojis to your selection.</p>
<p>This is another paragraph that you can select. Tiptap is a rich text editor that you can use to edit your text. It is a powerful tool that you can use to create beautiful documents. With the AI Toolkit, you can give your AI the ability to edit your document in real time.</p>
<p>This is yet another paragraph that you can select. Tiptap is a rich text editor that you can use to edit your text. It is a powerful tool that you can use to create beautiful documents. With the AI Toolkit, you can give your AI the ability to edit your document in real time.</p>`);
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

  const selectionIsEmpty = useEditorState({
    editor,
    selector: (snapshot) => snapshot.editor?.state.selection.empty ?? true,
  });

  if (!editor) {
    return null;
  }

  const editSelection = async (task: string) => {
    setIsLoading(true);

    try {
      const { from, to } = editor.state.selection;
      const response = await fetch("/api/server-insert-content-workflow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId,
          schemaAwarenessData: getSchemaAwarenessData(editor),
          task,
          sessionId,
          range: { from, to },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result: {
        sessionId: string;
        range: { from: number; to: number } | null;
      } = await response.json();
      setSessionId(result.sessionId);

      if (result.range) {
        setTimeout(() => {
          if (result.range) {
            editor.commands.setTextSelection(result.range);
          }
        }, 300);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const disabled = selectionIsEmpty || isLoading;
  const buttonClassName =
    "inline-flex items-center gap-1.5 rounded-lg border-none bg-[var(--gray-2)] text-[var(--black)] px-2.5 py-1.5 text-sm font-medium hover:bg-[var(--gray-3)] disabled:bg-[var(--gray-1)] disabled:text-[var(--gray-4)] transition-all duration-200 cursor-pointer disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col h-screen">
      <ToolbarPanel>
        <button
          type="button"
          onClick={() => editSelection("Add emojis to this text")}
          disabled={disabled}
          className={buttonClassName}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={14} /> Loading...
            </>
          ) : (
            "Add emojis"
          )}
        </button>
        <button
          type="button"
          onClick={() => editSelection("Make the text twice as long")}
          disabled={disabled}
          className={buttonClassName}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={14} /> Loading...
            </>
          ) : (
            "Make text longer"
          )}
        </button>
      </ToolbarPanel>
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
