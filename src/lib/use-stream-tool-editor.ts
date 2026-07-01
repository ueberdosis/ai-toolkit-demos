"use client";

import type { AnyExtension } from "@tiptap/core";
import { Collaboration } from "@tiptap/extension-collaboration";
import { CollaborationCaret } from "@tiptap/extension-collaboration-caret";
import { useEditor } from "@tiptap/react";
import { ServerAiToolkit } from "@tiptap/server-ai-toolkit";
import { TiptapCollabProvider } from "@tiptap-pro/provider";
import { useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";
import { getCollabConfig } from "@/app/server-ai-agent-chatbot/actions";

type UseStreamToolEditorOptions = {
  /** Slug used to build the collaborative document id. */
  slug: string;
  /** HTML content applied to the document on first connect. */
  initialContent: string;
  /** Content extensions placed before the collaboration baseline (StarterKit, Table, ...). */
  extensions: AnyExtension[];
  /** Extensions placed after ServerAiToolkit (e.g. TrackedChanges). */
  trailingExtensions?: AnyExtension[];
};

/**
 * Shared editor + collaboration wiring for the server stream-tool demos. Owns
 * the Y.Doc, the TiptapCollabProvider lifecycle, and the editor (with a shared
 * Collaboration / CollaborationCaret / ServerAiToolkit baseline plus the
 * caller's demo-specific extensions). Streamed edits arrive via Y.Doc sync.
 */
export function useStreamToolEditor({
  slug,
  initialContent,
  extensions,
  trailingExtensions = [],
}: UseStreamToolEditorOptions) {
  const [doc] = useState(() => new Y.Doc());
  const [documentId] = useState(() => `${slug}/${uuid()}`);
  const [provider, setProvider] = useState<TiptapCollabProvider | null>(null);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        ...extensions,
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
        ...trailingExtensions,
      ],
    },
    [provider],
  );

  // Capture the editor in a ref so the provider effect doesn't tear down the
  // websocket each time the editor recreates after `provider` changes.
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
            editorRef.current?.commands.setContent(initialContent);
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
  }, [documentId, doc, initialContent]);

  return { editor, documentId };
}
