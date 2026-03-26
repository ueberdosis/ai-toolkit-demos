"use client";

import { useChat } from "@ai-sdk/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { AiToolkit, getAiToolkit } from "@tiptap-pro/ai-toolkit";
import type { SplitView } from "@tiptap-pro/ai-toolkit";
import {
  findSuggestions,
  TrackedChanges,
} from "@tiptap-pro/extension-tracked-changes";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { Check, Columns2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatSidebar } from "../../components/chat-sidebar";
import "../../styles/tracked-changes.css";
import "../../styles/split-view.css";

interface PopoverState {
  diffId: string;
  top: number;
  left: number;
}

export default function Page() {
  const [hasSuggestions, setHasSuggestions] = useState(false);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const splitViewRef = useRef<SplitView | null>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  // Main editor
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TrackedChanges.configure({ enabled: false }),
      AiToolkit,
    ],
    content: `<h1>Remote Work Policy</h1>
<p>This document outlines our company's remote work guidelines. All employees should read and follow these rules.</p>

<h2>Eligibility</h2>
<p>Full-time employees who have completed their probation period can request remote work. Part-time employees and contractors need manager approval. New hires must work on-site for their first 90 days.</p>

<h2>Work Hours and Availability</h2>
<ul>
  <li>Core hours are 10 AM to 3 PM in your local time zone</li>
  <li>You must be reachable on Slack during core hours</li>
  <li>Team meetings should be scheduled within core hours</li>
  <li>Overtime must be approved by your manager in advance</li>
</ul>

<h2>Equipment and Setup</h2>
<p>The company provides a laptop and one monitor. Employees are responsible for their own internet connection, which should be stable enough for video calls. If you need additional equipment, submit a request through the IT portal.</p>

<h2>Communication</h2>
<p>Use Slack for quick questions, email for formal communication, and video calls for meetings that need discussion. Keep your calendar up to date so colleagues know when you're available. Respond to messages within 2 hours during core hours.</p>

<h2>Security</h2>
<ul>
  <li>Use the company VPN when accessing internal systems</li>
  <li>Don't work from public Wi-Fi without VPN</li>
  <li>Lock your screen when stepping away</li>
  <li>Report any security issues to IT immediately</li>
</ul>`,
  });

  // Preview editors for split view
  const leftExtensions = useMemo(() => [StarterKit, AiToolkit], []);
  const rightExtensions = useMemo(() => [StarterKit, AiToolkit], []);

  const leftEditor = useEditor({
    extensions: leftExtensions,
    editable: false,
    immediatelyRender: false,
  });

  const rightEditor = useEditor({
    extensions: rightExtensions,
    editable: false,
    immediatelyRender: false,
  });

  // Track suggestions
  useEffect(() => {
    if (!editor) return;

    const updateSuggestionState = () => {
      const suggestions = findSuggestions(editor, "suggestion");
      setHasSuggestions(suggestions.length > 0);
    };

    updateSuggestionState();
    editor.on("transaction", updateSuggestionState);

    return () => {
      editor.off("transaction", updateSuggestionState);
    };
  }, [editor]);

  // Create/destroy split view when entering/exiting compare mode
  useEffect(() => {
    if (
      !isCompareMode ||
      !editor ||
      !leftEditor ||
      !rightEditor ||
      !leftRef.current ||
      !rightRef.current
    ) {
      return;
    }

    const toolkit = getAiToolkit(editor);
    const splitView = toolkit.createSplitView({
      leftEditor,
      rightEditor,
      leftContainer: leftRef.current,
      rightContainer: rightRef.current,
    });

    splitViewRef.current = splitView;

    const handleSync = (entries: unknown[]) => {
      if (entries.length === 0) {
        setIsCompareMode(false);
      }
    };

    splitView.on("sync", handleSync);

    return () => {
      splitView.off("sync", handleSync);
      splitView.destroy();
      splitViewRef.current = null;
    };
  }, [isCompareMode, editor, leftEditor, rightEditor]);

  // Click handler for diff entries (popover)
  useEffect(() => {
    if (!isCompareMode) {
      setPopover(null);
      return;
    }

    const leftEl = leftRef.current;
    const rightEl = rightRef.current;
    if (!leftEl || !rightEl) return;

    const handleClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>(
        "[data-diff-id]",
      );
      if (!target) {
        setPopover(null);
        return;
      }

      const diffId = target.getAttribute("data-diff-id");
      if (!diffId) return;

      const rect = target.getBoundingClientRect();
      setPopover({
        diffId,
        top: rect.bottom + 4,
        left: rect.right,
      });
    };

    leftEl.addEventListener("click", handleClick);
    rightEl.addEventListener("click", handleClick);

    return () => {
      leftEl.removeEventListener("click", handleClick);
      rightEl.removeEventListener("click", handleClick);
    };
  }, [isCompareMode]);

  // Close popover on click outside
  useEffect(() => {
    if (!popover) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setPopover(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popover]);

  // Close popover on scroll
  useEffect(() => {
    if (!popover) return;

    const handleScroll = () => setPopover(null);
    const leftEl = leftRef.current;
    const rightEl = rightRef.current;

    leftEl?.addEventListener("scroll", handleScroll);
    rightEl?.addEventListener("scroll", handleScroll);

    return () => {
      leftEl?.removeEventListener("scroll", handleScroll);
      rightEl?.removeEventListener("scroll", handleScroll);
    };
  }, [popover]);

  const handleEntryAction = useCallback(
    (action: "accept" | "reject") => {
      const splitView = splitViewRef.current;
      if (!splitView || !popover) return;

      if (action === "accept") {
        splitView.acceptEntry(popover.diffId);
      } else {
        splitView.rejectEntry(popover.diffId);
      }
      setPopover(null);
    },
    [popover],
  );

  const handleAcceptAll = useCallback(() => {
    if (isCompareMode && splitViewRef.current) {
      splitViewRef.current.acceptAll();
    } else if (editor) {
      editor.commands.acceptAllSuggestions();
    }
  }, [isCompareMode, editor]);

  const handleRejectAll = useCallback(() => {
    if (isCompareMode && splitViewRef.current) {
      splitViewRef.current.rejectAll();
    } else if (editor) {
      editor.commands.rejectAllSuggestions();
    }
  }, [isCompareMode, editor]);

  // Chat
  const { messages, sendMessage, addToolOutput, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/split-view" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      if (!editor) return;

      const toolkit = getAiToolkit(editor);
      const result = toolkit.executeTool({
        toolName: toolCall.toolName,
        input: toolCall.input,
        reviewOptions: {
          mode: "trackedChanges",
          trackedChangesOptions: {
            userId: "ai-assistant",
            userMetadata: { name: "AI" },
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
    "Make this policy more professional. Add a section about expense reimbursement for home office costs.",
  );

  const isLoading = status !== "ready";
  const showReviewUi = !isLoading && hasSuggestions;

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  if (!editor) return null;

  return (
    <div className="flex h-screen split-view-demo">
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Normal mode: main editor */}
        {!isCompareMode && (
          <div className="flex-1 overflow-y-auto">
            <EditorContent editor={editor} />
          </div>
        )}

        {/* Compare mode: split view */}
        {isCompareMode && (
          <div className="flex flex-1 gap-0 overflow-hidden">
            {/* Left: Original */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="pb-2 px-4 pt-3">
                <span className="text-sm font-medium text-slate-500 px-3 py-1 rounded-full border border-slate-200 bg-white">
                  Original
                </span>
              </div>
              <div
                ref={leftRef}
                className="flex-1 overflow-y-auto border-t border-slate-200"
              >
                <EditorContent editor={leftEditor} />
              </div>
            </div>

            {/* Divider */}
            <div className="w-px bg-slate-200 self-stretch" />

            {/* Right: AI Suggestions */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="pb-2 px-4 pt-3">
                <span className="text-sm font-medium text-slate-500 px-3 py-1 rounded-full border border-slate-200 bg-white">
                  AI Suggestions
                </span>
              </div>
              <div
                ref={rightRef}
                className="flex-1 overflow-y-auto border-t border-slate-200"
              >
                <EditorContent editor={rightEditor} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat sidebar */}
      <ChatSidebar
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      >
        {showReviewUi && (
          <div className="border-t border-slate-200 p-4 space-y-3">
            <p className="text-xs text-slate-500">
              Review AI changes in the document.
            </p>

            <button
              type="button"
              onClick={() => setIsCompareMode((prev) => !prev)}
              className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium bg-[var(--purple-light)] text-[var(--purple)] hover:opacity-90 transition-all duration-200"
            >
              <Columns2 size={14} />
              {isCompareMode ? "Exit compare" : "Compare"}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAcceptAll}
                className="flex-1 rounded-lg px-3 py-2 text-sm font-medium bg-[var(--green)] text-white hover:opacity-90 transition-all duration-200"
              >
                Accept all
              </button>
              <button
                type="button"
                onClick={() => {
                  handleRejectAll();
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

      {/* Popover for accept/reject individual entries */}
      {popover && (
        <div
          ref={popoverRef}
          className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 flex items-center gap-1"
          style={{ top: popover.top, left: popover.left }}
        >
          <button
            type="button"
            onClick={() => handleEntryAction("reject")}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            <X className="h-3 w-3" />
            Reject
          </button>
          <button
            type="button"
            onClick={() => handleEntryAction("accept")}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded transition-colors"
          >
            <Check className="h-3 w-3" />
            Accept
          </button>
        </div>
      )}
    </div>
  );
}
