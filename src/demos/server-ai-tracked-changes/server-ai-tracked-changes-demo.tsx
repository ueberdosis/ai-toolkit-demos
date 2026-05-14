"use client";

import { useChat } from "@ai-sdk/react";
import { Collaboration } from "@tiptap/extension-collaboration";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import { getEditorContext, ServerAiToolkit } from "@tiptap/server-ai-toolkit";
import StarterKit from "@tiptap/starter-kit";
import { CommentsKit } from "@tiptap-pro/extension-comments";
import {
  findSuggestions,
  type Suggestion,
  TrackedChanges,
} from "@tiptap-pro/extension-tracked-changes";
import { TiptapCollabProvider } from "@tiptap-pro/provider";
import { DefaultChatTransport } from "ai";
import {
  Bold,
  Italic,
  Link,
  MessageSquarePlus,
  Pilcrow,
  Redo2,
  Undo2,
} from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";
import { getCollabConfig } from "@/app/server-ai-agent-chatbot/actions";
import { SuggestionReviewTooltip } from "@/components/suggestion-review-tooltip";
import { CommentsPanel } from "./comments-panel";
import { RightSidebar } from "./right-sidebar";
import "./server-ai-tracked-changes.css";
import { getUniqueSuggestions } from "./suggestion-utils";
import { TrackedChangesPanel } from "./tracked-changes-panel";
import { type DemoThread, useDemoThreads } from "./use-demo-threads";

type SuggestionTooltipMount = {
  suggestionId: string;
  element: HTMLElement;
  text: string;
};

type PanelId = "chat" | "tracked" | "comments" | "tracked-comments";

function getTrackedChangesEnabled(editor: { storage: unknown }) {
  const storage = (editor.storage as { trackedChanges?: unknown })
    .trackedChanges as { enabled?: boolean } | undefined;

  return Boolean(storage?.enabled);
}

function setTrackedChangesEnabledStorage(
  editor: { storage: unknown },
  enabled: boolean,
) {
  const storage = (editor.storage as { trackedChanges?: unknown })
    .trackedChanges as { enabled?: boolean } | undefined;

  if (storage) {
    storage.enabled = enabled;
  }
}

const initialTrackedChangesContent =
  "<h1>Tracked changes demo</h1><p>Ask the AI to improve this document. AI edits are written as tracked changes so you can accept or reject them one by one.</p><p>Select text to add comments, or use the toolbar to create manual tracked changes.</p>";

const demoUser = {
  id: "demo-user",
  name: "Demo User",
  avatarUrl: "https://i.pravatar.cc/150?u=demo-user",
};

export function ServerAiTrackedChangesDemo() {
  const [isMounted, setIsMounted] = useState(false);
  const [doc] = useState(() => new Y.Doc());
  const [documentId] = useState(() => `server-ai-tracked-changes/${uuid()}`);
  const [provider, setProvider] = useState<TiptapCollabProvider | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    let collabProvider: TiptapCollabProvider | null = null;

    const setupProvider = async () => {
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
      });

      setProvider(collabProvider);
    };

    setupProvider().catch((error) => {
      console.error("Failed to setup collaboration:", error);
    });

    return () => {
      collabProvider?.destroy();
    };
  }, [documentId, doc, isMounted]);

  if (!isMounted) {
    return null;
  }

  if (!provider) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="space-y-2 text-center">
          <div className="text-sm font-semibold text-slate-900">
            Loading collaboration document
          </div>
          <p className="text-xs text-slate-500">
            Mounting the comments provider before the editor initializes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <TrackedChangesEditor
      doc={doc}
      documentId={documentId}
      provider={provider}
    />
  );
}

function TrackedChangesEditor({
  doc,
  documentId,
  provider,
}: {
  doc: Y.Doc;
  documentId: string;
  provider: TiptapCollabProvider;
}) {
  const [activePanel, setActivePanel] = useState<PanelId>("chat");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isTrackedChangesEnabled, setIsTrackedChangesEnabled] = useState(false);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [showResolvedThreads, setShowResolvedThreads] = useState(false);
  const [tooltipMount, setTooltipMount] =
    useState<SuggestionTooltipMount | null>(null);
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const didSetInitialContentRef = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      LinkExtension.configure({ openOnClick: false }),
      Collaboration.configure({ document: doc }),
      ServerAiToolkit,
      TrackedChanges.configure({
        enabled: false,
        userId: demoUser.id,
        userMetadata: {
          name: demoUser.name,
          avatarUrl: demoUser.avatarUrl,
        },
      }),
      CommentsKit.configure({
        provider,
        onClickThread: (threadId: string | null) => {
          if (!threadId) {
            setSelectedThread(null);
            editor?.chain().unselectThread().run();
            return;
          }

          setSelectedThread(threadId);
          setActivePanel("comments");
          editor
            ?.chain()
            .selectThread({ id: threadId, updateSelection: false })
            .run();
        },
      }),
      Placeholder.configure({
        placeholder: "Ask the AI to improve this document...",
      }),
    ],
    editorProps: {
      attributes: {
        class: "server-ai-tracked-editor",
        spellcheck: "false",
      },
    },
    onCreate: ({ editor: currentEditor }) => {
      setSuggestions(
        getUniqueSuggestions(findSuggestions(currentEditor, "suggestion")),
      );
      setIsTrackedChangesEnabled(getTrackedChangesEnabled(currentEditor));
    },
    onUpdate: ({ editor: currentEditor }) => {
      setSuggestions(
        getUniqueSuggestions(findSuggestions(currentEditor, "suggestion")),
      );
      setIsTrackedChangesEnabled(getTrackedChangesEnabled(currentEditor));
    },
  });

  const { threads, createThread } = useDemoThreads(provider, editor, demoUser);

  useEffect(() => {
    if (!editor || didSetInitialContentRef.current || !editor.isEmpty) {
      return;
    }

    const wasEnabled = getTrackedChangesEnabled(editor);
    setTrackedChangesEnabledStorage(editor, false);
    editor.commands.setContent(initialTrackedChangesContent);
    setTrackedChangesEnabledStorage(editor, wasEnabled);
    didSetInitialContentRef.current = true;
  }, [editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const updateSuggestions = () => {
      setSuggestions(
        getUniqueSuggestions(findSuggestions(editor, "suggestion")),
      );
      setIsTrackedChangesEnabled(getTrackedChangesEnabled(editor));
    };

    editor.on("transaction", updateSuggestions);
    return () => {
      editor.off("transaction", updateSuggestions);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const updateTooltip = () => {
      const event = window.event;
      const target = event instanceof MouseEvent ? event.target : null;
      const suggestionElement =
        target instanceof Element
          ? target.closest("[data-suggestion-id]")
          : null;

      if (!suggestionElement) {
        setTooltipMount(null);
        return;
      }

      const suggestionId = suggestionElement.getAttribute("data-suggestion-id");
      if (!suggestionId) {
        setTooltipMount(null);
        return;
      }

      const rect = suggestionElement.getBoundingClientRect();

      if (!anchorRef.current) {
        anchorRef.current = document.createElement("span");
        anchorRef.current.style.cssText =
          "position: fixed; width: 1px; height: 1px; pointer-events: none;";
        document.body.appendChild(anchorRef.current);
      }

      anchorRef.current.style.left = `${rect.left + rect.width / 2}px`;
      anchorRef.current.style.top = `${rect.top}px`;

      const matchingThread = threads.find(
        (thread) => thread.data?.suggestionId === suggestionId,
      );
      const comment = matchingThread
        ? provider.getThreadComments(matchingThread.id, true)?.[0]
        : null;

      setTooltipMount({
        suggestionId,
        element: anchorRef.current,
        text:
          typeof comment?.content === "string" && comment.content
            ? comment.content
            : matchingThread?.data?.suggestionReason ||
              "Review this tracked change",
      });
    };

    const editorElement = editor.view.dom;
    editorElement.addEventListener("mouseover", updateTooltip);
    editorElement.addEventListener("mouseleave", () => setTooltipMount(null));

    return () => {
      editorElement.removeEventListener("mouseover", updateTooltip);
      editorElement.removeEventListener("mouseleave", () =>
        setTooltipMount(null),
      );
      anchorRef.current?.remove();
      anchorRef.current = null;
    };
  }, [editor, provider, threads]);

  const editorContext = editor ? getEditorContext(editor) : null;
  const editorContextRef = useRef(editorContext);
  editorContextRef.current = editorContext;

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/server-ai-tracked-changes",
      body: () => ({
        editorContext: editorContextRef.current,
        documentId,
      }),
    }),
  });

  const [input, setInput] = useState(
    "Replace the last paragraph with a short story about Tiptap.",
  );

  const isLoading = status !== "ready";

  const reasonBySuggestionId = useMemo(
    () =>
      Object.fromEntries(
        threads
          .filter(
            (thread) =>
              typeof thread.data?.suggestionId === "string" &&
              typeof thread.data?.suggestionReason === "string",
          )
          .map((thread) => [
            thread.data?.suggestionId as string,
            thread.data?.suggestionReason as string,
          ]),
      ),
    [threads],
  );

  const linkedSuggestionThreads = useMemo(
    () => threads.filter((thread) => thread.data?.suggestionId),
    [threads],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (input.trim()) {
      sendMessage({ text: input });
      setInput("");
      setActivePanel("chat");
    }
  };

  const selectThreadInEditor = useCallback(
    (threadId: string) => {
      setSelectedThread(threadId);
      editor
        ?.chain()
        .selectThread({ id: threadId, scrollIntoView: true })
        .run();
    },
    [editor],
  );

  const toggleLink = useCallback(() => {
    if (!editor) {
      return;
    }

    const currentHref = editor.getAttributes("link").href || "";
    const href = window.prompt("Enter the URL for this link:", currentHref);

    if (href === null) {
      return;
    }

    if (href.trim().length === 0) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor.chain().focus().setLink({ href: href.trim() }).run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  const trackedPanel = (
    <TrackedChangesPanel
      editor={editor}
      suggestions={suggestions}
      reasonBySuggestionId={reasonBySuggestionId}
    />
  );

  const commentsPanel = (
    <CommentsPanel
      editor={editor}
      provider={provider}
      threads={threads}
      selectedThread={selectedThread}
      showResolved={showResolvedThreads}
      onShowResolvedChange={setShowResolvedThreads}
      onSelectThread={selectThreadInEditor}
      onCreateThread={createThread}
    />
  );

  return (
    <div className="server-ai-tracked-changes-demo flex h-screen overflow-hidden bg-slate-50">
      <main className="flex min-w-0 flex-1 flex-col">
        <Toolbar
          isTrackedChangesEnabled={isTrackedChangesEnabled}
          hasSelection={!editor.state.selection.empty}
          hasSuggestions={suggestions.length > 0}
          onToggleTrackedChanges={() => {
            editor.commands.toggleTrackedChanges();
            setIsTrackedChangesEnabled(getTrackedChangesEnabled(editor));
          }}
          onBold={() => editor.chain().focus().toggleBold().run()}
          onItalic={() => editor.chain().focus().toggleItalic().run()}
          onLink={toggleLink}
          onAddComment={createThread}
          onAddInsertion={() => {
            const content = window.prompt(
              "Enter the inline content to insert:",
              "",
            );
            if (!content?.trim()) {
              return;
            }
            editor.commands.addTrackedInsertion({
              from: editor.state.selection.from,
              content: content.trim(),
            });
          }}
          onAddDeletion={() => {
            const { from, to, empty } = editor.state.selection;
            if (!empty) {
              editor.commands.addTrackedDeletion({ from, to });
            }
          }}
          onAddReplacement={() => {
            const content = window.prompt(
              "Enter the inline replacement content:",
              "",
            );
            const { from, to, empty } = editor.state.selection;
            if (!empty && content?.trim()) {
              editor.commands.addTrackedReplacement({
                from,
                to,
                content: content.trim(),
              });
            }
          }}
          onAcceptAll={() => editor.commands.acceptAllSuggestions()}
          onRejectAll={() => editor.commands.rejectAllSuggestions()}
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-10">
          <div className="mx-auto max-w-3xl rounded-sm border border-slate-200 bg-white px-12 py-10 shadow-sm">
            <EditorContent editor={editor} />
          </div>
          {tooltipMount &&
            createPortal(
              <SuggestionReviewTooltip
                referenceElement={tooltipMount.element}
                text={tooltipMount.text}
                onAccept={() =>
                  editor.commands.acceptSuggestion({
                    id: tooltipMount.suggestionId,
                  })
                }
                onReject={() =>
                  editor.commands.rejectSuggestion({
                    id: tooltipMount.suggestionId,
                  })
                }
              />,
              tooltipMount.element,
            )}
        </div>
      </main>

      <RightSidebar
        activePanel={activePanel}
        onActivePanelChange={setActivePanel}
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        trackedPanel={trackedPanel}
        commentsPanel={commentsPanel}
        trackedCommentsPanel={
          <div className="grid h-full grid-rows-2 overflow-hidden">
            <div className="min-h-0 border-b border-slate-200">
              <TrackedChangesPanel
                editor={editor}
                suggestions={suggestions}
                reasonBySuggestionId={reasonBySuggestionId}
              />
            </div>
            <div className="min-h-0">
              <CommentsPanel
                editor={editor}
                provider={provider}
                threads={linkedSuggestionThreads as DemoThread[]}
                selectedThread={selectedThread}
                showResolved={showResolvedThreads}
                onShowResolvedChange={setShowResolvedThreads}
                onSelectThread={selectThreadInEditor}
                onCreateThread={createThread}
              />
            </div>
          </div>
        }
      />
    </div>
  );
}

function Toolbar({
  isTrackedChangesEnabled,
  hasSelection,
  hasSuggestions,
  onToggleTrackedChanges,
  onBold,
  onItalic,
  onLink,
  onAddComment,
  onAddInsertion,
  onAddDeletion,
  onAddReplacement,
  onAcceptAll,
  onRejectAll,
}: {
  isTrackedChangesEnabled: boolean;
  hasSelection: boolean;
  hasSuggestions: boolean;
  onToggleTrackedChanges: () => void;
  onBold: () => void;
  onItalic: () => void;
  onLink: () => void;
  onAddComment: () => void;
  onAddInsertion: () => void;
  onAddDeletion: () => void;
  onAddReplacement: () => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
}) {
  const buttonClass =
    "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100 disabled:cursor-default disabled:bg-slate-100 disabled:text-slate-400";

  return (
    <div className="sticky top-0 z-10 flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
      <button
        type="button"
        onClick={onBold}
        className={buttonClass}
        title="Bold"
      >
        <Bold size={15} />
      </button>
      <button
        type="button"
        onClick={onItalic}
        className={buttonClass}
        title="Italic"
      >
        <Italic size={15} />
      </button>
      <button
        type="button"
        onClick={onLink}
        className={buttonClass}
        title="Link"
      >
        <Link size={15} />
      </button>
      <button
        type="button"
        onClick={onToggleTrackedChanges}
        className={`${buttonClass} ${
          isTrackedChangesEnabled
            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
            : ""
        }`}
      >
        <Pilcrow size={15} />
        Track changes {isTrackedChangesEnabled ? "on" : "off"}
      </button>
      <button type="button" onClick={onAddInsertion} className={buttonClass}>
        Add insertion
      </button>
      <button
        type="button"
        onClick={onAddDeletion}
        disabled={!hasSelection}
        className={buttonClass}
      >
        Add deletion
      </button>
      <button
        type="button"
        onClick={onAddReplacement}
        disabled={!hasSelection}
        className={buttonClass}
      >
        Add replacement
      </button>
      <button
        type="button"
        onClick={onAddComment}
        disabled={!hasSelection}
        className={buttonClass}
      >
        <MessageSquarePlus size={15} />
        Comment
      </button>
      <span className="mx-1 h-6 w-px bg-slate-200" />
      <button
        type="button"
        onClick={onAcceptAll}
        disabled={!hasSuggestions}
        className={buttonClass}
      >
        <Undo2 size={15} />
        Accept all
      </button>
      <button
        type="button"
        onClick={onRejectAll}
        disabled={!hasSuggestions}
        className={buttonClass}
      >
        <Redo2 size={15} />
        Reject all
      </button>
    </div>
  );
}
