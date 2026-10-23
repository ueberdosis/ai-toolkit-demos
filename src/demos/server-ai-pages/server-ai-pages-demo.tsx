"use client";

import { useChat } from "@ai-sdk/react";
import { getEditorContext } from "@tiptap/ai-toolkit";
import type { Editor } from "@tiptap/core";
import { EditorContent } from "@tiptap/react";
import { ImportDocx } from "@tiptap-pro/extension-import-docx";
import type { TiptapCollabProvider } from "@tiptap-pro/provider";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { type PanelId, RightSidebar } from "@/components/right-sidebar";
import { useStreamToolEditor } from "@/lib/use-stream-tool-editor";
import {
  clearOperation,
  exportJson,
  generateOperation,
  importFileOperation,
  pageFormatOperation,
} from "./document-sources";
import {
  instrumentCollaboration,
  instrumentEditor,
  instrumentLongTasks,
} from "./instrument";
import {
  measureInitialSync,
  measureOperation,
  type Operation,
} from "./measure";
import { MetricsPanel } from "./metrics-panel";
import { createPagesExtensions, PAGE_GAP_BACKGROUND } from "./pages-extensions";
import { PagesToolbar } from "./pages-toolbar";
import { PerfRecorder } from "./perf-recorder";
import { useToolCallTimings } from "./use-tool-call-timings";
import "./server-ai-pages.css";

const WELCOME_CONTENT = `<h1>Pages performance test</h1>
<p>Use the toolbar to generate a large document or import a DOCX, JSON, or HTML file. The Metrics tab logs how long loading, pagination, and syncing to Tiptap Cloud take.</p>
<p>Copy the link and open it in a second window to test collaboration, or ask the AI agent to find and edit a section.</p>`;

const DEFAULT_FOOTER = "Page {page} of {total}";

const DEFAULT_PROMPT =
  'Find the heading "Section 42" and add a one-sentence summary of that section right below the heading.';

function seedDocument(editor: Editor) {
  editor
    .chain()
    .setContent(WELCOME_CONTENT)
    .setMeta("addToHistory", false)
    .run();
  editor.commands.setFooter(DEFAULT_FOOTER);
}

interface ServerAiPagesDemoProps {
  slug: string;
  documentId: string;
  /** Seeds the welcome content after the first sync. */
  isNewDocument: boolean;
  /** Conversion token for DOCX import; DOCX import is disabled without it. */
  convertToken: string | null;
  convertTokenError: string | null;
}

export function ServerAiPagesDemo({
  slug,
  documentId,
  isNewDocument,
  convertToken,
  convertTokenError,
}: ServerAiPagesDemoProps) {
  const [recorder] = useState(() => new PerfRecorder());
  const [extensions] = useState(createPagesExtensions);
  const [trailingExtensions] = useState(() =>
    convertToken ? [ImportDocx.configure({ token: convertToken })] : [],
  );
  const { editor, provider } = useStreamToolEditor({
    slug,
    documentId,
    extensions,
    trailingExtensions,
  });

  const editorRef = useRef(editor);
  editorRef.current = editor;
  const openedProvider = useRef<TiptapCollabProvider | null>(null);
  const seeded = useRef(false);

  useEffect(() => instrumentLongTasks(recorder), [recorder]);

  useEffect(() => {
    if (!editor) return;
    return instrumentEditor(editor, recorder);
  }, [editor, recorder]);

  useEffect(() => {
    if (!provider) return;
    return instrumentCollaboration(provider, recorder);
  }, [provider, recorder]);

  useEffect(() => {
    if (!convertTokenError) return;
    recorder.log("warning", "DOCX import unavailable", [
      { label: "Reason", value: convertTokenError },
    ]);
  }, [convertTokenError, recorder]);

  // The editor is recreated with collaboration once the provider exists, so this
  // re-runs until the first sync meets that editor, then seeds new documents
  // and measures the open.
  useEffect(() => {
    const isCollaborative = editor?.extensionManager.extensions.some(
      (extension) => extension.name === "collaboration",
    );
    if (!provider || !editor || !isCollaborative) return;
    const onSynced = () => {
      if (openedProvider.current === provider || editor.isDestroyed) return;
      openedProvider.current = provider;
      if (isNewDocument && !seeded.current) {
        seeded.current = true;
        seedDocument(editor);
      }
      void measureInitialSync(editor, recorder);
    };
    if (provider.isSynced) onSynced();
    else provider.on("synced", onSynced);
    return () => {
      provider.off("synced", onSynced);
    };
  }, [provider, editor, isNewDocument, recorder]);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/server-ai-agent-chatbot",
      // Read the editor through a ref: the AI SDK keeps the first transport (vercel/ai#7819).
      body: () => ({
        editorContext: editorRef.current
          ? getEditorContext(editorRef.current)
          : null,
        documentId,
      }),
    }),
  });
  useToolCallTimings(messages, status, recorder);

  const [input, setInput] = useState(DEFAULT_PROMPT);
  const [activePanel, setActivePanel] = useState<PanelId>("metrics");
  const isLoading = status === "submitted" || status === "streaming";

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  if (!editor) return null;

  const run = (operation: Operation) => {
    void measureOperation({ editor, provider, recorder }, operation);
  };

  return (
    <div className="flex h-screen">
      <div className="flex min-w-0 flex-1 flex-col">
        <PagesToolbar
          recorder={recorder}
          canImportDocx={convertToken !== null}
          onGenerate={(pages) => run(generateOperation(editor, pages))}
          onImportFile={(file, repeat) =>
            run(importFileOperation(editor, file, repeat))
          }
          onPageFormatChange={(pageFormat) =>
            run(pageFormatOperation(editor, pageFormat))
          }
          onExport={() =>
            exportJson(
              editor,
              recorder,
              `${documentId.replace(/\W+/g, "-")}.json`,
            )
          }
          onClear={() => run(clearOperation(editor))}
        />
        <div
          className="server-ai-pages-canvas min-h-0 flex-1 overflow-auto"
          style={{ backgroundColor: PAGE_GAP_BACKGROUND }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      <RightSidebar
        activePanel={activePanel}
        onActivePanelChange={setActivePanel}
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        metricsPanel={
          <MetricsPanel recorder={recorder} documentId={documentId} />
        }
      />
    </div>
  );
}
