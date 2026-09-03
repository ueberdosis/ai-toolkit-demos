"use client";

import { useChat } from "@ai-sdk/react";
import { Collaboration } from "@tiptap/extension-collaboration";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AiToolkit, getAiToolkit } from "@tiptap-pro/client-ai-toolkit";
import {
  CommentsKit,
  hoverOffThread,
  hoverThread,
} from "@tiptap-pro/extension-comments";
import {
  findSuggestions,
  type Suggestion,
  TrackedChanges,
} from "@tiptap-pro/extension-tracked-changes";
import { TiptapCollabProvider } from "@tiptap-pro/provider";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";
import { type PanelId, RightSidebar } from "../../components/right-sidebar";
import { SuggestionReviewTooltip } from "../../components/suggestion-review-tooltip";
import { ThreadsProvider } from "../../demos/comments/React/context.jsx";
import { useThreads } from "../../demos/comments/React/hooks/useThreads.jsx";
import { useUser } from "../../demos/comments/React/hooks/useUser.jsx";
import { CommentsPanel } from "../../demos/server-ai-tracked-changes/comments-panel";
import { getUniqueSuggestions } from "../../demos/server-ai-tracked-changes/suggestion-utils";
import { TrackedChangesPanel } from "../../demos/server-ai-tracked-changes/tracked-changes-panel";
import type { DemoThread } from "../../demos/server-ai-tracked-changes/use-demo-threads";
import "../../demos/server-ai-tracked-changes/server-ai-tracked-changes.css";
import "../../styles/tracked-changes.css";

type SuggestionTooltipMount = {
  suggestionId: string;
  element: HTMLElement;
  text: string;
};

const initialTrackedChangesCommentsContent =
  "<h1>Tracked changes demo</h1><p>Ask the AI to improve this document. AI edits are written as tracked changes so you can accept or reject them one by one.</p>";

const demoUser = {
  id: "demo-user",
  name: "Demo User",
  avatarUrl: "https://i.pravatar.cc/150?u=demo-user",
};

function getTrackedChangesEnabled(editor: { storage: unknown }) {
  const storage = (editor.storage as { trackedChanges?: unknown })
    .trackedChanges as { enabled?: boolean } | undefined;

  return Boolean(storage?.enabled);
}

const documentModel = new Y.Doc();

const provider = new TiptapCollabProvider({
  appId: "7j9y6m10",
  name: `tiptap-tracked-changes-comments-demo/${uuid()}`,
  document: documentModel,
});

export default function Page() {
  const user = useUser();
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
      AiToolkit,
      StarterKit.configure({
        undoRedo: false,
        link: false,
      }),
      LinkExtension.configure({ openOnClick: false }),
      Collaboration.configure({
        document: documentModel,
      }),
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
        placeholder: "Ask the AI to improve this document…",
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

  const threadsResult = useThreads(provider, editor, user);
  const threads: DemoThread[] = Array.isArray(threadsResult.threads)
    ? threadsResult.threads
    : [];
  const createThread = threadsResult.createThread;

  useEffect(() => {
    if (!editor || didSetInitialContentRef.current || !editor.isEmpty) {
      return;
    }

    editor.commands.setContent(initialTrackedChangesCommentsContent);
    didSetInitialContentRef.current = true;
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

      const anchorElement = anchorRef.current;

      if (!anchorElement) {
        return;
      }

      anchorElement.style.left = `${coords.left}px`;
      anchorElement.style.top = `${coords.top}px`;

      const matchingThread = threads.find(
        (thread) => thread.data?.suggestionId === selectedSuggestion.id,
      );
      const firstComment =
        matchingThread?.comments?.find(
          (comment) =>
            typeof comment.content === "string" && comment.content.length > 0,
        ) ??
        (matchingThread
          ? provider
              .getThreadComments(matchingThread.id, true)
              ?.find(
                (comment) =>
                  typeof comment.content === "string" &&
                  comment.content.length > 0,
              )
          : null);
      const text =
        typeof firstComment?.content === "string" && firstComment.content
          ? firstComment.content
          : matchingThread?.data?.suggestionReason ||
            "Review this tracked change";

      setTooltipMount({
        suggestionId: selectedSuggestion.id,
        element: anchorElement,
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
  }, [editor, threads]);

  const selectThreadInEditor = useCallback(
    (threadId: string) => {
      setSelectedThread(threadId);
      editor?.chain().selectThread({ id: threadId }).run();
    },
    [editor],
  );

  const deleteThread = useCallback(
    (threadId: string) => {
      provider.deleteThread(threadId);
      editor?.commands.removeThread({ id: threadId });
    },
    [editor],
  );

  const resolveThread = useCallback(
    (threadId: string) => {
      editor?.commands.resolveThread({ id: threadId });
    },
    [editor],
  );

  const unresolveThread = useCallback(
    (threadId: string) => {
      editor?.commands.unresolveThread({ id: threadId });
    },
    [editor],
  );

  const updateComment = useCallback(
    (
      threadId: string,
      commentId: string,
      content: string,
      metaData: Record<string, string>,
    ) => {
      editor?.commands.updateComment({
        threadId,
        id: commentId,
        content,
        data: metaData,
      });
    },
    [editor],
  );

  const onHoverThread = useCallback(
    (threadId: number) => {
      if (editor) {
        hoverThread(editor, [threadId]);
      }
    },
    [editor],
  );

  const onLeaveThread = useCallback(() => {
    if (editor) {
      hoverOffThread(editor);
    }
  }, [editor]);

  const { messages, sendMessage, addToolOutput, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/tracked-changes-comments",
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      if (!editor) {
        return;
      }

      const toolkit = getAiToolkit(editor);
      const result = toolkit.executeTool({
        toolName: toolCall.toolName,
        input: toolCall.input,
        reviewOptions: {
          mode: "trackedChanges",
          trackedChangesOptions: {
            userId: "ai-assistant",
            userMetadata: {
              name: "AI",
            },
          },
        },
        commentsOptions: {
          threadData: {
            userName: "AI",
          },
          commentData: {
            userName: "AI",
          },
        },
      });

      addToolOutput({
        tool: toolCall.toolName,
        toolCallId: toolCall.toolCallId,
        output: result.output,
      });
    },
  });

  const [input, setInput] = useState(
    "Replace the last paragraph with a short story about Tiptap.",
  );

  const isLoading = status !== "ready";

  const reasonBySuggestionId = useMemo(
    () =>
      Object.fromEntries(
        threads.flatMap((thread) => {
          const suggestionId = thread.data?.suggestionId;
          const reason =
            thread.comments?.find((comment) => comment.content)?.content ??
            thread.data?.suggestionReason;

          return typeof suggestionId === "string" && typeof reason === "string"
            ? [[suggestionId, reason]]
            : [];
        }),
      ),
    [threads],
  );

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();

    if (input.trim()) {
      sendMessage({ text: input });
      setInput("");
      setActivePanel("chat");
    }
  };

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
    <ThreadsProvider
      // @ts-expect-error JSX interop with JS comments demo code
      onClickThread={selectThreadInEditor}
      // @ts-expect-error JSX interop with JS comments demo code
      onDeleteThread={deleteThread}
      // @ts-expect-error JSX interop with JS comments demo code
      onHoverThread={onHoverThread}
      // @ts-expect-error JSX interop with JS comments demo code
      onLeaveThread={onLeaveThread}
      // @ts-expect-error JSX interop with JS comments demo code
      onResolveThread={resolveThread}
      // @ts-expect-error JSX interop with JS comments demo code
      onUpdateComment={updateComment}
      // @ts-expect-error JSX interop with JS comments demo code
      onUnresolveThread={unresolveThread}
      // @ts-expect-error JSX interop with JS comments demo code
      selectedThreads={editor.storage.comments.focusedThreads}
      // @ts-expect-error JSX interop with JS comments demo code
      selectedThread={selectedThread}
      // @ts-expect-error JSX interop with JS comments demo code
      setSelectedThread={setSelectedThread}
      // @ts-expect-error JSX interop with JS comments demo code
      threads={threads}
    >
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
        />
      </div>
    </ThreadsProvider>
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
