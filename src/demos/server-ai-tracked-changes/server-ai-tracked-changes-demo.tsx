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
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";
import { getCollabConfig } from "@/app/server-ai-agent-chatbot/actions";
import { CopyTestCaseButton } from "@/components/capture-test-case/copy-test-case-button";
import { SuggestionReviewTooltip } from "@/components/suggestion-review-tooltip";
import { CommentsPanel } from "./comments-panel";
import type { PanelId } from "./panel-id";
import { RightSidebar } from "./right-sidebar";
import "../../styles/tracked-changes.css";
import "./server-ai-tracked-changes.css";
import { getUniqueSuggestions } from "./suggestion-utils";
import { TrackedChangesPanel } from "./tracked-changes-panel";
import { useDemoThreads } from "./use-demo-threads";

type SuggestionTooltipMount = {
  suggestionId: string;
  element: HTMLElement;
  text: string;
};

function getTrackedChangesEnabled(editor: { storage: unknown }) {
  const storage = (editor.storage as { trackedChanges?: unknown })
    .trackedChanges as { enabled?: boolean } | undefined;

  return Boolean(storage?.enabled);
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
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [showResolvedThreads, setShowResolvedThreads] = useState(false);
  const [tooltipMount, setTooltipMount] =
    useState<SuggestionTooltipMount | null>(null);
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const didSetInitialContentRef = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({ undoRedo: false, link: false }),
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
    },
    onUpdate: ({ editor: currentEditor }) => {
      setSuggestions(
        getUniqueSuggestions(findSuggestions(currentEditor, "suggestion")),
      );
    },
  });

  const { threads, createThread } = useDemoThreads(provider, editor, demoUser);

  useEffect(() => {
    if (!editor || didSetInitialContentRef.current || !editor.isEmpty) {
      return;
    }

    editor.commands.setContent(initialTrackedChangesContent);
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

    const handleClick = (event: MouseEvent) => {
      const result = editor.view.posAtCoords({
        left: event.clientX,
        top: event.clientY,
      });
      if (!result) {
        setTooltipMount(null);
        return;
      }
      const selectedSuggestion = findSuggestions(editor, "suggestion").find(
        (suggestion) =>
          result.pos >= suggestion.from && result.pos <= suggestion.to,
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

      const matchingThread = threads.find(
        (thread) => thread.data?.suggestionId === selectedSuggestion.id,
      );
      const comment = matchingThread
        ? provider.getThreadComments(matchingThread.id, true)?.[0]
        : null;
      const text =
        typeof comment?.content === "string" && comment.content
          ? comment.content
          : matchingThread?.data?.suggestionReason ||
            "Review this tracked change";

      setTooltipMount({
        suggestionId: selectedSuggestion.id,
        element: anchorRef.current,
        text,
      });
    };

    const dom = editor.view.dom;
    dom.addEventListener("click", handleClick);

    return () => {
      dom.removeEventListener("click", handleClick);
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
    <div className="server-ai-tracked-changes-demo flex h-screen overflow-hidden bg-white">
      <main className="flex min-w-0 flex-1 flex-col">
        <Toolbar
          isTrackedChangesEnabled={getTrackedChangesEnabled(editor)}
          isBoldActive={editor.isActive("bold")}
          isItalicActive={editor.isActive("italic")}
          isLinkActive={editor.isActive("link")}
          hasSelection={!editor.state.selection.empty}
          onToggleTrackedChanges={() => {
            editor.commands.toggleTrackedChanges();
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
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          <EditorContent editor={editor} />
          {tooltipMount && (
            <SuggestionReviewTooltip
              referenceElement={tooltipMount.element}
              text={tooltipMount.text}
              onAccept={() => {
                editor.commands.acceptSuggestion({
                  id: tooltipMount.suggestionId,
                });
                setTooltipMount(null);
              }}
              onReject={() => {
                editor.commands.rejectSuggestion({
                  id: tooltipMount.suggestionId,
                });
                setTooltipMount(null);
              }}
            />
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
        inputAction={
          <CopyTestCaseButton
            editor={editor}
            messages={messages}
            status={status}
            requestConfig={{ reviewOptions: { mode: "trackedChanges" } }}
          />
        }
      />
    </div>
  );
}

function Toolbar({
  isTrackedChangesEnabled,
  isBoldActive,
  isItalicActive,
  isLinkActive,
  hasSelection,
  onToggleTrackedChanges,
  onBold,
  onItalic,
  onLink,
  onAddComment,
  onAddInsertion,
  onAddDeletion,
  onAddReplacement,
}: {
  isTrackedChangesEnabled: boolean;
  isBoldActive: boolean;
  isItalicActive: boolean;
  isLinkActive: boolean;
  hasSelection: boolean;
  onToggleTrackedChanges: () => void;
  onBold: () => void;
  onItalic: () => void;
  onLink: () => void;
  onAddComment: () => void;
  onAddInsertion: () => void;
  onAddDeletion: () => void;
  onAddReplacement: () => void;
}) {
  const buttonClass =
    "cursor-pointer rounded-lg border-none bg-[var(--gray-2)] px-2.5 py-1.5 text-sm font-medium leading-[1.15] text-[var(--black)] transition-all duration-200 ease-[cubic-bezier(0.65,0.05,0.36,1)] hover:bg-[var(--gray-3)] hover:text-[var(--black-contrast)] disabled:cursor-default disabled:bg-[var(--gray-1)] disabled:text-[var(--gray-4)]";
  const activeButtonClass =
    "bg-[var(--purple)] text-[var(--white)] hover:bg-[var(--purple-contrast)] hover:text-[var(--white)]";

  return (
    <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-white p-4">
      <button
        type="button"
        onClick={onBold}
        className={`${buttonClass} ${isBoldActive ? activeButtonClass : ""}`}
      >
        Bold
      </button>
      <button
        type="button"
        onClick={onItalic}
        className={`${buttonClass} ${isItalicActive ? activeButtonClass : ""}`}
      >
        Italic
      </button>
      <button
        type="button"
        onClick={onLink}
        className={`${buttonClass} ${isLinkActive ? activeButtonClass : ""}`}
      >
        Link
      </button>
      <button
        type="button"
        onClick={onToggleTrackedChanges}
        className={`${buttonClass} ${
          isTrackedChangesEnabled ? activeButtonClass : ""
        }`}
      >
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
        Comment
      </button>
    </div>
  );
}
