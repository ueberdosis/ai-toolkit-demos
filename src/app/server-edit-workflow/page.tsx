"use client";

import { Collaboration } from "@tiptap/extension-collaboration";
import { EditorContent, useEditor } from "@tiptap/react";
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
import { getCollabConfig } from "../server-ai-agent-chatbot/actions";

const INITIAL_CONTENT = `<h1>Document Editor Demo</h1>
<p>This is a sample document that can be edited by AI. The text here is informal and could use some improvements.</p>
<p>You can ask the AI to make the text more formal, add more details, simplify it, or transform it in any way you like.</p>
<p>Try different tasks to see how the AI can help you edit your documents!</p>`;

export default function Page() {
  const [doc] = useState(() => new Y.Doc());
  const [documentId] = useState(() => `server-edit-workflow/${uuid()}`);
  const providerRef = useRef<TiptapCollabProvider | null>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: doc }),
      ServerAiToolkit,
    ],
  });
  const [task, setTask] = useState(
    "Make the text more formal and professional, but do not change the title",
  );
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

  if (!editor) {
    return null;
  }

  const editDocument = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/server-edit-workflow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId,
          schemaAwarenessData: getSchemaAwarenessData(editor),
          task,
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
    <div className="flex flex-col h-screen">
      <div className="flex flex-col sm:flex-row sm:items-start gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <textarea
          value={task}
          onChange={(event) => {
            setTask(event.target.value);
            event.target.style.height = "auto";
            event.target.style.height = `${event.target.scrollHeight}px`;
          }}
          placeholder="Enter editing task..."
          rows={1}
          className="flex-1 resize-none border border-[var(--gray-3)] rounded-lg px-3 py-1.5 text-sm focus:border-[var(--purple)] focus:outline-none min-h-16 sm:min-h-0"
        />
        <button
          type="button"
          onClick={editDocument}
          disabled={isLoading || !task.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border-none bg-[var(--gray-2)] text-[var(--black)] px-2.5 py-1.5 text-sm font-medium hover:bg-[var(--gray-3)] disabled:bg-[var(--gray-1)] disabled:text-[var(--gray-4)] transition-all duration-200 cursor-pointer disabled:cursor-not-allowed w-full sm:w-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={14} /> Editing...
            </>
          ) : (
            "Edit Document"
          )}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
