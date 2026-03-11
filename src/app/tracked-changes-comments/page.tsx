"use client";

import { useChat } from "@ai-sdk/react";
import { Collaboration } from "@tiptap/extension-collaboration";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AiToolkit, getAiToolkit } from "@tiptap-pro/ai-toolkit";
import {
  CommentsKit,
  hoverOffThread,
  hoverThread,
} from "@tiptap-pro/extension-comments";
import {
  findSuggestions,
  TrackedChanges,
} from "@tiptap-pro/extension-tracked-changes";
import { TiptapCollabProvider } from "@tiptap-pro/provider";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { MessageSquareText } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { v4 as uuid } from "uuid";
import * as Y from "yjs";
import { ChatSidebar } from "../../components/chat-sidebar";
import { SuggestionReviewTooltip } from "../../components/suggestion-review-tooltip";
import { ThreadsList } from "../../demos/comments/React/components/ThreadsList.jsx";
import { ThreadsProvider } from "../../demos/comments/React/context.jsx";
import { useThreads } from "../../demos/comments/React/hooks/useThreads.jsx";
import { useUser } from "../../demos/comments/React/hooks/useUser.jsx";
import "../../demos/comments/React/styles.scss";
import "../../demos/comments/style.scss";
import "../../styles/tracked-changes.css";

type SuggestionTooltipMount = {
  suggestionId: string;
  element: HTMLElement;
  text: string;
};

type DemoThread = {
  id: string;
  resolvedAt?: string | null;
  data?: {
    suggestionId?: string;
  };
};

const documentModel = new Y.Doc();

const provider = new TiptapCollabProvider({
  appId: "7j9y6m10",
  name: `tiptap-tracked-changes-comments-demo/${uuid()}`,
  document: documentModel,
});

export default function Page() {
  const user = useUser();
  const [hasSuggestions, setHasSuggestions] = useState(false);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [tooltipMount, setTooltipMount] =
    useState<SuggestionTooltipMount | null>(null);
  const anchorRef = useRef<HTMLSpanElement | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      AiToolkit,
      StarterKit.configure({
        undoRedo: false,
      }),
      Collaboration.configure({
        document: documentModel,
      }),
      TrackedChanges.configure({
        enabled: false,
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
        // @ts-expect-error spellcheck is a valid DOM attribute
        spellcheck: false,
      },
    },
    content:
      "<h1>Tracked changes demo</h1><p>Ask the AI to improve this document. AI edits are written as tracked changes so you can accept or reject them one by one.</p>",
  });

  const threadsResult = useThreads(provider, editor, user);
  const threads: DemoThread[] = Array.isArray(threadsResult.threads)
    ? threadsResult.threads
    : [];

  useEffect(() => {
    if (!editor) {
      return;
    }

    const updateSuggestionState = () => {
      setHasSuggestions(findSuggestions(editor, "suggestion").length > 0);
    };

    const updateTooltip = () => {
      const { from } = editor.state.selection;
      const selectedSuggestion = findSuggestions(editor, "suggestion").find(
        (suggestion) => from >= suggestion.from && from <= suggestion.to,
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
      const matchingThreadId = matchingThread?.id ?? null;
      let firstComment = null;

      if (typeof matchingThreadId === "string") {
        const threadComments = provider.getThreadComments(
          matchingThreadId,
          true,
        );

        firstComment = Array.isArray(threadComments) ? threadComments[0] : null;
      }

      setTooltipMount({
        suggestionId: selectedSuggestion.id,
        element: anchorElement,
        text:
          typeof firstComment?.content === "string" && firstComment.content
            ? firstComment.content
            : "Review this tracked change",
      });
    };

    updateSuggestionState();
    updateTooltip();

    editor.on("transaction", updateSuggestionState);
    editor.on("selectionUpdate", updateTooltip);

    return () => {
      editor.off("transaction", updateSuggestionState);
      editor.off("selectionUpdate", updateTooltip);
      anchorRef.current?.remove();
      anchorRef.current = null;
    };
  }, [editor, threads]);

  const selectThreadInEditor = useCallback(
    (threadId: string) => {
      editor.chain().selectThread({ id: threadId }).run();
    },
    [editor],
  );

  const deleteThread = useCallback(
    (threadId: string) => {
      provider.deleteThread(threadId);
      editor.commands.removeThread({ id: threadId });
    },
    [editor],
  );

  const resolveThread = useCallback(
    (threadId: string) => {
      editor.commands.resolveThread({ id: threadId });
    },
    [editor],
  );

  const unresolveThread = useCallback(
    (threadId: string) => {
      editor.commands.unresolveThread({ id: threadId });
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
      editor.commands.updateComment({
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
      hoverThread(editor, [threadId]);
    },
    [editor],
  );

  const onLeaveThread = useCallback(() => {
    hoverOffThread(editor);
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
    "Improve the document and justify each tracked change with a short comment.",
  );

  const isLoading = status !== "ready";
  const showReviewUi = !isLoading && hasSuggestions;
  const openThreads = threads.filter((thread) => !thread.resolvedAt);

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();

    if (input.trim()) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  if (!editor) {
    return null;
  }

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
      <div className="tracked-changes-comments-demo flex h-screen">
        <div
          className="col-group divide-x divide-gray-200 flex-1 overflow-hidden"
          data-viewmode="open"
        >
          <aside className="sidebar border-r border-gray-200 bg-white">
            <div className="space-y-3">
              <div>
                <div className="label-large">Comments</div>
                <p className="label-small mt-1">
                  Each non-empty operation meta becomes a comment thread linked
                  to its tracked change.
                </p>
              </div>
              <ThreadsList provider={provider} threads={openThreads} />
            </div>
          </aside>

          <div className="main overflow-y-auto">
            <EditorContent editor={editor} />
            {tooltipMount &&
              createPortal(
                <SuggestionReviewTooltip
                  referenceElement={tooltipMount.element}
                  text={tooltipMount.text}
                  onAccept={() => {
                    editor.commands.acceptSuggestion({
                      id: tooltipMount.suggestionId,
                    });
                  }}
                  onReject={() => {
                    editor.commands.rejectSuggestion({
                      id: tooltipMount.suggestionId,
                    });
                  }}
                />,
                tooltipMount.element,
              )}
          </div>
        </div>

        <ChatSidebar
          messages={messages}
          input={input}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        >
          {showReviewUi && (
            <div className="border-t border-slate-200 p-4 space-y-2">
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <MessageSquareText size={14} />
                Review tracked changes and their linked comments.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    editor.commands.acceptAllSuggestions();
                  }}
                  className="flex-1 rounded-lg px-3 py-2 text-sm font-medium bg-[var(--green)] text-white hover:opacity-90 transition-all duration-200"
                >
                  Accept all
                </button>
                <button
                  type="button"
                  onClick={() => {
                    editor.commands.rejectAllSuggestions();
                    sendMessage({
                      text: "Some changes were rejected. Ask the user what should be improved before you edit the document again.",
                    });
                  }}
                  className="flex-1 rounded-lg px-3 py-2 text-sm font-medium bg-[var(--gray-2)] text-[var(--black)] hover:bg-[var(--gray-3)] transition-all duration-200"
                >
                  Reject all
                </button>
              </div>
            </div>
          )}
        </ChatSidebar>
      </div>
    </ThreadsProvider>
  );
}
