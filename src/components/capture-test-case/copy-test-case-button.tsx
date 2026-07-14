"use client";

import { getEditorContext } from "@tiptap/ai-toolkit";
import type { Editor } from "@tiptap/react";
import type { UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { buildCaptureJson, type CaptureToolCall } from "./build-capture-json";

interface CopyTestCaseButtonProps {
  editor: Editor | null;
  messages: UIMessage[];
  status: string;
  /** Request params the demo's route adds server-side (e.g. reviewOptions), so the captured requests are faithful. */
  requestConfig?: Record<string, unknown>;
  className?: string;
}

/** A tool-invocation part the AI SDK streams into messages, e.g. `tool-tiptapEdit`. */
interface ToolPart {
  type: string;
  input?: unknown;
  output?: unknown;
  state?: string;
}

/** Collect the completed toolkit calls of the latest run — everything after the last user message. */
function toolCallsOfLatestRun(messages: UIMessage[]): CaptureToolCall[] {
  const lastUserIndex = messages
    .map((message) => message.role)
    .lastIndexOf("user");
  const runMessages =
    lastUserIndex >= 0 ? messages.slice(lastUserIndex + 1) : messages;

  const calls: CaptureToolCall[] = [];
  for (const message of runMessages) {
    for (const part of message.parts as ToolPart[]) {
      if (part.type?.startsWith("tool-") && part.state === "output-available") {
        calls.push({
          toolName: part.type.replace("tool-", ""),
          input: part.input,
          output: part.output,
        });
      }
    }
  }
  return calls;
}

/**
 * "Copy test case" button for the server AI demos. Snapshots the document before
 * the AI run and after it settles, collects the tool calls from the chat stream,
 * and copies `{ documentBefore, documentAfter, editorContext, toolCalls }` to the
 * clipboard so a developer can turn a spotted bug into a regression test by hand.
 */
export function CopyTestCaseButton({
  editor,
  messages,
  status,
  requestConfig,
  className,
}: CopyTestCaseButtonProps) {
  const beforeRef = useRef<unknown>(null);
  const [feedback, setFeedback] = useState<"copied" | "failed" | null>(null);
  const prevStatusRef = useRef(status);

  // Snapshot the document when a run starts, before the AI touches it.
  useEffect(() => {
    if (editor && prevStatusRef.current === "ready" && status !== "ready") {
      beforeRef.current = editor.getJSON();
    }
    prevStatusRef.current = status;
  }, [status, editor]);

  const toolCalls = toolCallsOfLatestRun(messages);

  const handleCopy = async () => {
    if (!editor) {
      return;
    }
    // documentAfter is read here, on click — by now the collab/Yjs sync has
    // settled, which avoids racing the AI SDK stream end against the editor.
    const json = buildCaptureJson({
      documentBefore: beforeRef.current,
      documentAfter: editor.getJSON(),
      editorContext: getEditorContext(editor),
      toolCalls,
      requestConfig,
    });
    try {
      await navigator.clipboard.writeText(json);
      setFeedback("copied");
    } catch (error) {
      console.error("Failed to copy test case to clipboard:", error);
      setFeedback("failed");
    }
    setTimeout(() => setFeedback(null), 1500);
  };

  // Dev-only tool — hidden in production builds, and only shown once a run has
  // finished and produced something to copy.
  if (
    process.env.NODE_ENV === "production" ||
    !editor ||
    status !== "ready" ||
    toolCalls.length === 0
  ) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      title="Copy {document before/after, tool calls} as JSON to turn into a regression test"
      className={
        className ??
        "shrink-0 cursor-pointer rounded-lg border-none bg-[var(--gray-2)] px-3 py-2 text-sm font-medium text-[var(--black)] transition-colors hover:bg-[var(--gray-3)] hover:text-[var(--black-contrast)]"
      }
    >
      {feedback === "copied"
        ? "Copied!"
        : feedback === "failed"
          ? "Copy failed"
          : `Copy case (${toolCalls.length})`}
    </button>
  );
}
