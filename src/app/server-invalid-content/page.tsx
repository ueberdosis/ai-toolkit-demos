"use client";

import { getEditorContext, ServerAiToolkit } from "@tiptap/ai-toolkit";
import { Collaboration } from "@tiptap/extension-collaboration";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TiptapCollabProvider } from "@tiptap-pro/provider";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";
import { ResponsiveRightSidebar } from "@/components/responsive-right-sidebar";
import { SegmentedControl } from "@/components/segmented-control";
import { getCollabConfig } from "../server-ai-agent-chatbot/actions";
import "./invalid-content.css";
import { Callout, Highlight } from "./writer-only-extensions";

type OnInvalidContent = "remove" | "error";

type RequestResult =
  | { ok: true; docChanged: boolean }
  | { ok: false; error: string };

const initialContent = `<h1>Invalid content demo</h1>
<p>This paragraph matches both schemas.</p>
<p>This sentence has a <mark>highlighted phrase</mark>. The AI request schema has no highlight mark.</p>
<p>The last paragraph matches both schemas too.</p>
`;

const createDocumentId = () => `server-invalid-content/${uuid()}`;

const buttonClassName =
  "flex w-full items-center justify-center gap-2 rounded-lg border-none px-4 py-2 text-sm font-medium bg-[var(--gray-2)] text-[var(--black)] hover:bg-[var(--gray-3)] hover:text-[var(--black-contrast)] disabled:bg-[var(--gray-1)] disabled:text-[var(--gray-4)] cursor-pointer disabled:cursor-default";

export default function Page() {
  const [{ doc, documentId }, setDocument] = useState(() => ({
    doc: new Y.Doc(),
    documentId: createDocumentId(),
  }));
  const [provider, setProvider] = useState<TiptapCollabProvider | null>(null);
  const [onInvalidContent, setOnInvalidContent] =
    useState<OnInvalidContent>("error");
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<
    Array<{ id: string; mode: OnInvalidContent; result: RequestResult }>
  >([]);

  // The writer's editor knows a callout node and a highlight mark.
  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: doc }),
        ServerAiToolkit,
        Callout,
        Highlight,
      ],
    },
    [provider],
  );

  // Never rendered: it only provides the narrower schema that the AI requests send.
  const requestSchemaEditor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ undoRedo: false }), ServerAiToolkit],
  });

  const editorRef = useRef(editor);
  editorRef.current = editor;

  useEffect(() => {
    let cancelled = false;
    let createdProvider: TiptapCollabProvider | null = null;

    const setupProvider = async () => {
      try {
        const { appId, collabBaseUrl } = await getCollabConfig(
          "user-1",
          documentId,
        );
        if (cancelled) return;

        createdProvider = new TiptapCollabProvider({
          ...(collabBaseUrl ? { baseUrl: collabBaseUrl } : { appId }),
          name: documentId,
          // Pass the token as a function so the provider mints a fresh JWT on every reconnect.
          token: async () =>
            (await getCollabConfig("user-1", documentId)).token,
          document: doc,
          user: "user-1",
        });

        // Seed only a new document, so a reconnect doesn't bring removed content back.
        createdProvider.on("synced", () => {
          if (doc.getXmlFragment("default").length > 0) return;
          editorRef.current
            ?.chain()
            .setContent(initialContent)
            .setMeta("addToHistory", false)
            .run();
        });

        createdProvider.on(
          "authenticationFailed",
          ({ reason }: { reason: unknown }) => {
            console.error("Collaboration authentication failed:", reason);
          },
        );

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

  const runReadOnlyRequest = async () => {
    if (!requestSchemaEditor) return;

    setIsRunning(true);
    try {
      const response = await fetch("/api/server-invalid-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editorContext: getEditorContext(requestSchemaEditor),
          documentId,
          onInvalidContent,
        }),
      });
      const result: RequestResult = await response.json();
      setResults((previous) => [
        { id: uuid(), mode: onInvalidContent, result },
        ...previous,
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const insertCallout = () => {
    editor
      ?.chain()
      .focus("end")
      .insertContent({
        type: "callout",
        content: [{ type: "text", text: "Important customer note" }],
      })
      .run();
  };

  const insertHighlightedText = () => {
    editor
      ?.chain()
      .focus("end")
      .insertContent({
        type: "paragraph",
        content: [
          { type: "text", text: "New " },
          { type: "text", text: "highlighted", marks: [{ type: "highlight" }] },
          { type: "text", text: " text." },
        ],
      })
      .run();
  };

  const startNewDocument = () => {
    setResults([]);
    setDocument({ doc: new Y.Doc(), documentId: createDocumentId() });
  };

  if (!editor) return null;

  return (
    <div className="flex h-screen">
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      <ResponsiveRightSidebar
        mobileTitle="Read-only request"
        triggerLabel="Request"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 text-sm">
          <p className="text-[var(--gray-5)]">
            The editor has a callout node and a highlight mark. The AI request
            only sends the StarterKit schema, so the server sees them as invalid
            content. Run a read-only <code>tiptapRead</code> request and watch
            the editor.
          </p>

          <div className="flex flex-col gap-2">
            <span className="font-medium">Add invalid content</span>
            <button
              type="button"
              className={buttonClassName}
              onClick={insertHighlightedText}
            >
              Add highlighted text
            </button>
            <button
              type="button"
              className={buttonClassName}
              onClick={insertCallout}
            >
              Add callout
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-medium">document.onInvalidContent</span>
            <SegmentedControl
              options={[
                { id: "error", label: "error" },
                { id: "remove", label: "remove (default)" },
              ]}
              value={onInvalidContent}
              onChange={setOnInvalidContent}
            />
            <button
              type="button"
              className={buttonClassName}
              onClick={runReadOnlyRequest}
              disabled={isRunning || !requestSchemaEditor}
            >
              {isRunning && <Loader2 className="animate-spin" size={16} />}
              Run read-only request
            </button>
            <button
              type="button"
              className={buttonClassName}
              onClick={startNewDocument}
            >
              New document
            </button>
          </div>

          <p className="text-xs text-[var(--gray-5)]">
            After a request, the server keeps the document open for up to 45
            seconds. Content you add in that time is removed, even with{" "}
            <code>error</code>. Start a new document to try again.
          </p>

          <div className="flex flex-col gap-2">
            <span className="font-medium">Responses</span>
            {results.length === 0 && (
              <span className="text-[var(--gray-4)]">No requests yet</span>
            )}
            {results.map(({ id, mode, result }) => (
              <div key={id} className="rounded-lg bg-[var(--gray-1)] p-3">
                <div className="mb-1 font-medium">
                  {result.ok ? "Success" : "Error"} · {mode}
                </div>
                <pre className="whitespace-pre-wrap break-words text-xs">
                  {result.ok
                    ? `docChanged: ${result.docChanged}`
                    : result.error}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </ResponsiveRightSidebar>
    </div>
  );
}
