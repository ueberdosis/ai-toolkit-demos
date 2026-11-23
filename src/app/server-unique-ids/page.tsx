"use client";

import { useChat } from "@ai-sdk/react";
import { getEditorContext, ServerAiToolkit } from "@tiptap/ai-toolkit";
import { Collaboration } from "@tiptap/extension-collaboration";
import UniqueID from "@tiptap/extension-unique-id";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TrackedChanges } from "@tiptap-pro/extension-tracked-changes";
import { TiptapCollabProvider } from "@tiptap-pro/provider";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";
import { ChatSidebar } from "@/components/chat-sidebar";
import { SegmentedControl } from "@/components/segmented-control";
import { getCollabConfig } from "../server-ai-agent-chatbot/actions";
import "@/styles/tracked-changes.css";
import "./unique-ids.css";
import { collectIds, IdSummary } from "./id-summary";
import {
  type ReviewMode,
  type ToolSet,
  uniqueIdOptions,
} from "./unique-id-options";

const initialContent = `<h1>Project update</h1>
<p>The new search page shipped on Monday. Early feedback from customers is positive.</p>
<p>Page load times went up by 20 percent. The team is looking into the cause this week.</p>
<p>The next sprint focuses on filters. Design reviews start on Thursday.</p>
<ul><li><p>Write the release notes</p></li><li><p>Fix the slow query</p></li><li><p>Plan the filters demo</p></li></ul>
`;

const createDocumentId = () => `server-unique-ids/${uuid()}`;

const buttonClassName =
  "flex-1 rounded-lg border-none px-3 py-1.5 text-xs font-medium bg-[var(--gray-2)] text-[var(--black)] hover:bg-[var(--gray-3)] cursor-pointer";

export default function Page() {
  const [{ doc, documentId }, setDocument] = useState(() => ({
    doc: new Y.Doc(),
    documentId: createDocumentId(),
  }));
  const [provider, setProvider] = useState<TiptapCollabProvider | null>(null);
  const [toolSet, setToolSet] = useState<ToolSet>("tiptapEdit");
  const [reviewMode, setReviewMode] = useState<ReviewMode>("disabled");
  const [previousIds, setPreviousIds] = useState<ReadonlySet<string> | null>(
    null,
  );

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: doc }),
        ServerAiToolkit,
        UniqueID.configure(uniqueIdOptions),
        // Only for the suggestion schema and styles: the user's own edits stay direct.
        TrackedChanges.configure({ enabled: false, userId: "user-1" }),
      ],
    },
    [provider],
  );

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

        // Seed only an empty document, so a reconnect doesn't add the content twice. The fragment
        // isn't empty here: Unique ID has already written an ID on the editor's empty paragraph.
        createdProvider.on("synced", () => {
          if (!editorRef.current?.isEmpty) return;
          editorRef.current
            ?.chain()
            .setContent(initialContent)
            .setMeta("addToHistory", false)
            .run();
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

  // Fixes issue: https://github.com/vercel/ai/issues/7819
  const editorContext = editor ? getEditorContext(editor) : null;
  const requestBodyRef = useRef({});
  requestBodyRef.current = { editorContext, documentId, toolSet, reviewMode };

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/server-unique-ids",
      body: () => requestBodyRef.current,
    }),
  });

  const [input, setInput] = useState("");

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    if (!input.trim() || !editor) return;
    // The sidebar compares the IDs after the request with these.
    setPreviousIds(
      new Set(collectIds(editor).flatMap(({ id }) => (id ? [id] : []))),
    );
    sendMessage({ text: input });
    setInput("");
  };

  const startNewDocument = () => {
    setMessages([]);
    setPreviousIds(null);
    setDocument({ doc: new Y.Doc(), documentId: createDocumentId() });
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
        isLoading={status !== "ready"}
      >
        <div className="flex flex-col gap-3 border-t border-slate-200 p-3 text-sm">
          <IdSummary editor={editor} previousIds={previousIds} />
          <SegmentedControl
            options={[
              { id: "tiptapEdit", label: "tiptapEdit" },
              { id: "tiptapQuery", label: "tiptapQuery" },
              { id: "replaceDocument", label: "replaceDoc" },
            ]}
            value={toolSet}
            onChange={setToolSet}
          />
          <SegmentedControl
            options={[
              { id: "disabled", label: "Direct edits" },
              { id: "trackedChanges", label: "Tracked changes" },
            ]}
            value={reviewMode}
            onChange={setReviewMode}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className={buttonClassName}
              onClick={() => editor.commands.acceptAllSuggestions()}
            >
              Accept all
            </button>
            <button
              type="button"
              className={buttonClassName}
              onClick={() => editor.commands.rejectAllSuggestions()}
            >
              Reject all
            </button>
            <button
              type="button"
              className={buttonClassName}
              onClick={startNewDocument}
            >
              New document
            </button>
          </div>
        </div>
      </ChatSidebar>
    </div>
  );
}
