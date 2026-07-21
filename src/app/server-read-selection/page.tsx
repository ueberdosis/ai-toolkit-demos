"use client";

import { useChat } from "@ai-sdk/react";
import { getEditorContext, ServerAiToolkit } from "@tiptap/ai-toolkit";
import { Collaboration } from "@tiptap/extension-collaboration";
import { CollaborationCaret } from "@tiptap/extension-collaboration-caret";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TiptapCollabProvider } from "@tiptap-pro/provider";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";
import { ChatSidebar } from "../../components/chat-sidebar";
import { getCollabConfig } from "./actions";

/**
 * The awareness user.id this client publishes. The agent forwards it as the
 * readSelection tool's config.user, so the server reads THIS user's selection.
 */
const HUMAN_USER_ID = "human-1";

const initialContent = `<h1>Project update</h1>
<p>Hey team, quick heads up on where things stand. The build is mostly working now, but we hit a bunch of annoying bugs last week that really slowed us down. I think we can still make the deadline if everyone pitches in.</p>
<p>Honestly, the biggest headache is that nobody knows who owns the deployment stuff, so it keeps falling through the cracks and someone ends up scrambling at the last minute. We should just pick a person and move on.</p>
<p>Anyway, ping me if you want to hop on a call to sort this out. I'm around most afternoons this week and happy to walk through the details whenever works for you.</p>`;

/** Pre-selected on load. Must appear verbatim in `initialContent`. */
const SEEDED_SENTENCE = "Hey team, quick heads up on where things stand.";

export default function Page() {
  const [doc] = useState(() => new Y.Doc());
  const [documentId] = useState(() => `server-read-selection/${uuid()}`);
  const [provider, setProvider] = useState<TiptapCollabProvider | null>(null);
  const seededRef = useRef(false);

  // The editor is (re)created once the provider exists so CollaborationCaret can
  // publish this user's selection to awareness (which is what readSelection reads).
  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: doc }),
        ServerAiToolkit,
        ...(provider
          ? [
              CollaborationCaret.configure({
                provider,
                user: { id: HUMAN_USER_ID, name: "You", color: "#6a00f5" },
              }),
            ]
          : []),
      ],
    },
    [provider],
  );

  const editorRef = useRef(editor);
  editorRef.current = editor;

  useEffect(() => {
    let cancelled = false;
    let created: TiptapCollabProvider | null = null;

    const setup = async () => {
      const { appId, collabBaseUrl } = await getCollabConfig(
        "user-1",
        documentId,
      );
      if (cancelled) return;
      created = new TiptapCollabProvider({
        ...(collabBaseUrl ? { baseUrl: collabBaseUrl } : { appId }),
        name: documentId,
        token: async () => (await getCollabConfig("user-1", documentId)).token,
        document: doc,
        user: "user-1",
        onConnect() {
          if (seededRef.current) return;
          seededRef.current = true;
          const currentEditor = editorRef.current;
          if (!currentEditor) return;
          currentEditor.commands.setContent(initialContent);
          // Seed a clean selection on the first sentence, found by text rather
          // than fragile hardcoded positions, then focus so CollaborationCaret
          // publishes it to awareness.
          let range: { from: number; to: number } | null = null;
          currentEditor.state.doc.descendants((node, pos) => {
            if (range) return false;
            if (node.isText && node.text) {
              const index = node.text.indexOf(SEEDED_SENTENCE);
              if (index !== -1) {
                range = {
                  from: pos + index,
                  to: pos + index + SEEDED_SENTENCE.length,
                };
                return false;
              }
            }
            return true;
          });
          if (range) currentEditor.commands.setTextSelection(range);
          currentEditor.commands.focus();
        },
      });
      setProvider(created);
    };

    setup().catch((error) =>
      console.error("Failed to setup collaboration:", error),
    );

    return () => {
      cancelled = true;
      created?.destroy();
      setProvider(null);
    };
  }, [documentId, doc]);

  // Fixes issue: https://github.com/vercel/ai/issues/7819
  const editorContext = editor ? getEditorContext(editor) : null;
  const editorContextRef = useRef(editorContext);
  editorContextRef.current = editorContext;

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/server-read-selection",
      body: () => ({
        editorContext: editorContextRef.current,
        documentId,
        selectionUserId: HUMAN_USER_ID,
      }),
    }),
  });

  const [input, setInput] = useState("Rewrite my selection to be more formal");

  const isLoading = status !== "ready";

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    if (!editor || !input.trim()) return;
    // Moving to the chat input blurred the editor, and CollaborationCaret nulls
    // the awareness cursor on blur. Re-focus to re-publish the selection so the
    // agent's readSelection can read it.
    editor.commands.focus();
    sendMessage({ text: input });
    setInput("");
  };

  if (!editor || !provider) return null;

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
        isLoading={isLoading}
        placeholder="Select text, then ask the AI to change it..."
      />
    </div>
  );
}
