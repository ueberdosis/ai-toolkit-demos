import {
  type ChatStatus,
  type DynamicToolUIPart,
  getToolName,
  isToolUIPart,
  type ToolUIPart,
  type UIMessage,
} from "ai";
import { useEffect, useRef } from "react";
import { formatBytes, formatCount, formatDuration } from "./format";
import type { LogDetail, PerfRecorder } from "./perf-recorder";

type ToolPart = ToolUIPart | DynamicToolUIPart;

/** The fields of a toolkit tool's input and output that are worth logging. */
type ToolkitInput = { operations?: Array<{ action?: { type?: string } }> };
type ToolkitOutput = {
  success?: boolean;
  error?: string;
  operationResults?: Array<{ success?: boolean; code?: string }>;
};

function describeToolCall(part: ToolPart): {
  failed: boolean;
  details: LogDetail[];
} {
  const details: LogDetail[] = [];
  const operations = (part.input as ToolkitInput | undefined)?.operations;
  if (Array.isArray(operations)) {
    details.push({
      label: "Operations",
      value: operations.map((op) => op.action?.type ?? "unknown").join(", "),
    });
  }

  if (part.state === "output-error") {
    details.push({ label: "Error", value: part.errorText });
    return { failed: true, details };
  }

  const output = part.output as ToolkitOutput | undefined;
  details.push({
    label: "Output",
    value: formatBytes(JSON.stringify(output ?? null).length),
  });
  if (output?.error) {
    details.push({ label: "Error", value: output.error });
    return { failed: true, details };
  }
  if (output?.success === false) {
    const code = output.operationResults?.find(
      (result) => result.success === false,
    )?.code;
    details.push({
      label: "Result",
      value: code ? `failed (${code})` : "failed",
    });
  }
  return { failed: false, details };
}

/**
 * Logs how long each server-side tool call took, measured on the client from
 * the complete tool input arriving to its output arriving, plus a summary per
 * AI run.
 */
export function useToolCallTimings(
  messages: UIMessage[],
  status: ChatStatus,
  recorder: PerfRecorder,
): void {
  const calls = useRef(
    new Map<string, { startedAt: number; finished: boolean }>(),
  );
  const run = useRef<{
    startedAt: number;
    toolCalls: number;
    toolMs: number;
  } | null>(null);

  useEffect(() => {
    const now = performance.now();
    for (const message of messages) {
      if (message.role !== "assistant") continue;
      for (const part of message.parts) {
        if (!isToolUIPart(part) || part.state === "input-streaming") continue;

        let call = calls.current.get(part.toolCallId);
        if (!call) {
          call = { startedAt: now, finished: false };
          calls.current.set(part.toolCallId, call);
        }
        const isDone =
          part.state === "output-available" || part.state === "output-error";
        if (call.finished || !isDone) continue;

        call.finished = true;
        const duration = now - call.startedAt;
        if (run.current) {
          run.current.toolCalls += 1;
          run.current.toolMs += duration;
        }
        const { failed, details } = describeToolCall(part);
        recorder.log(failed ? "error" : "info", getToolName(part), [
          { label: "Duration", value: formatDuration(duration) },
          ...details,
        ]);
      }
    }
  }, [messages, recorder]);

  useEffect(() => {
    const isRunning = status === "submitted" || status === "streaming";
    if (isRunning && !run.current) {
      run.current = { startedAt: performance.now(), toolCalls: 0, toolMs: 0 };
      return;
    }
    if (isRunning || !run.current) return;

    const finished = run.current;
    run.current = null;
    recorder.log(
      status === "error" ? "error" : "success",
      status === "error" ? "AI run failed" : "AI run finished",
      [
        {
          label: "Duration",
          value: formatDuration(performance.now() - finished.startedAt),
        },
        {
          label: "Tool calls",
          value: `${formatCount(finished.toolCalls)}, ${formatDuration(finished.toolMs)} in total`,
        },
      ],
    );
  }, [status, recorder]);
}
