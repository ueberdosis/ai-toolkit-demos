import type { Editor } from "@tiptap/core";
import type { TiptapCollabProvider } from "@tiptap-pro/provider";
import {
  describeCloseEvent,
  formatBytes,
  formatCount,
  formatDuration,
} from "./format";
import type { LogDetail, LongTaskStats, PerfRecorder } from "./perf-recorder";

const POLL_INTERVAL_MS = 250;
const LATE_POLL_MS = 100;
const QUIET_PERIOD_MS = 2000;
const TIMEOUT_MS = 15 * 60_000;

export interface MeasureTarget {
  editor: Editor;
  provider: TiptapCollabProvider | null;
  recorder: PerfRecorder;
}

export interface PreparedOperation {
  /** Synchronous editor update. */
  apply: () => void;
  details?: LogDetail[];
}

export interface Operation {
  label: string;
  /**
   * Does the slow work that doesn't touch the editor, e.g. generating JSON or
   * converting a file. `reportProgress` shows a short status next to the label.
   */
  prepare: (
    reportProgress: (message: string) => void,
  ) => Promise<PreparedOperation>;
}

interface LayoutResult {
  pages: number | null;
  settledAt: number;
  passes: number;
  timedOut: boolean;
  tabWasHidden: boolean;
}

type UploadResult =
  | { status: "acknowledged"; at: number }
  | { status: "nothing-to-send" }
  | { status: "failed"; reason: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => setTimeout(resolve, 0)),
  );
}

/**
 * Resolves once Pages has been idle for a quiet period: no layout pass, no
 * page-count change, and no late poll (a late timer means the main thread was busy).
 */
function waitForLayoutToSettle(
  editor: Editor,
  recorder: PerfRecorder,
): Promise<LayoutResult> {
  const startedAt = performance.now();
  const passesBefore = recorder.totals().layoutPasses;
  const readPages = () =>
    editor.isDestroyed
      ? null
      : (editor.storage.pages?.getPageCount?.() ?? null);

  return new Promise((resolve) => {
    let pages = readPages();
    let lastPassAt = recorder.totals().lastLayoutPassAt;
    let lastActivityAt = startedAt;
    let expectedAt = startedAt + POLL_INTERVAL_MS;
    let tabWasHidden = document.hidden;

    const finish = (settledAt: number, timedOut: boolean) => {
      resolve({
        pages,
        settledAt,
        passes: recorder.totals().layoutPasses - passesBefore,
        timedOut,
        tabWasHidden,
      });
    };

    const poll = () => {
      const now = performance.now();
      const currentPages = readPages();
      const { lastLayoutPassAt } = recorder.totals();
      tabWasHidden ||= document.hidden;

      if (lastLayoutPassAt !== lastPassAt) {
        lastPassAt = lastLayoutPassAt;
        lastActivityAt = Math.max(lastActivityAt, lastLayoutPassAt);
      }
      // Hidden tabs throttle timers, so lateness says nothing about the main thread there.
      const pollWasLate = !document.hidden && now - expectedAt > LATE_POLL_MS;
      if (currentPages !== pages || pollWasLate) {
        pages = currentPages;
        lastActivityAt = now;
      }

      if (now - lastActivityAt >= QUIET_PERIOD_MS) {
        finish(lastActivityAt, false);
        return;
      }
      if (now - startedAt >= TIMEOUT_MS) {
        finish(now, true);
        return;
      }
      expectedAt = now + POLL_INTERVAL_MS;
      setTimeout(poll, POLL_INTERVAL_MS);
    };
    setTimeout(poll, POLL_INTERVAL_MS);
  });
}

/** Resolves when the server has acknowledged every pending local update. */
function waitForUpload(
  provider: TiptapCollabProvider | null,
): Promise<UploadResult> {
  if (!provider) {
    return Promise.resolve({ status: "failed", reason: "not connected" });
  }
  if (provider.unsyncedChanges === 0) {
    return Promise.resolve({ status: "nothing-to-send" });
  }

  return new Promise((resolve) => {
    const finish = (result: UploadResult) => {
      provider.off("unsyncedChanges", onUnsyncedChanges);
      provider.off("close", onClose);
      clearTimeout(timeout);
      resolve(result);
    };
    const onUnsyncedChanges = ({ number }: { number: number }) => {
      if (number === 0)
        finish({ status: "acknowledged", at: performance.now() });
    };
    const onClose = ({ event }: { event: CloseEvent }) => {
      finish({
        status: "failed",
        reason: `connection closed (${describeCloseEvent(event)})`,
      });
    };
    const timeout = setTimeout(() => {
      finish({
        status: "failed",
        reason: `no acknowledgement after ${formatDuration(TIMEOUT_MS)}`,
      });
    }, TIMEOUT_MS);

    provider.on("unsyncedChanges", onUnsyncedChanges);
    provider.on("close", onClose);
  });
}

function describeLayout(layout: LayoutResult, since: number): string {
  if (layout.timedOut) {
    return `still busy after ${formatDuration(TIMEOUT_MS)}`;
  }
  return `${formatDuration(layout.settledAt - since)}, ${formatCount(layout.passes)} layout passes`;
}

function describeUpload(
  upload: UploadResult,
  since: number,
  bytes: number,
): string {
  switch (upload.status) {
    case "acknowledged":
      return `${formatBytes(bytes)} acknowledged after ${formatDuration(upload.at - since)}`;
    case "nothing-to-send":
      return "nothing to send";
    case "failed":
      return `failed: ${upload.reason}`;
  }
}

function describeLongTasks(stats: LongTaskStats | null): string {
  if (!stats) return "long tasks aren't observable in this browser";
  if (stats.count === 0) return "no long tasks";
  return `blocked ${formatDuration(stats.totalMs)} in ${formatCount(stats.count)} long tasks, longest ${formatDuration(stats.maxMs)}`;
}

function blockCount(editor: Editor): string {
  return formatCount(editor.isDestroyed ? null : editor.state.doc.childCount);
}

function hiddenTabNote(layout: LayoutResult): LogDetail[] {
  return layout.tabWasHidden
    ? [{ label: "Note", value: "the tab was hidden, timings are unreliable" }]
    : [];
}

/**
 * Runs one document change and logs its cost: preparing the input, applying
 * it, the first paint, Pages layout, the server acknowledging the Yjs update,
 * and main-thread blocking along the way.
 */
export async function measureOperation(
  { editor, provider, recorder }: MeasureTarget,
  operation: Operation,
): Promise<void> {
  if (recorder.busy) return;
  recorder.update({ busy: operation.label });
  const startedAt = performance.now();
  const bytesSentBefore = recorder.totals().bytesSent;

  try {
    const prepared = await operation.prepare((message) =>
      recorder.update({ busy: `${operation.label} (${message})` }),
    );
    const preparedAt = performance.now();
    prepared.apply();
    const appliedAt = performance.now();
    // Start listening before awaiting anything, so a fast acknowledgement isn't missed.
    const upload = waitForUpload(provider);
    await nextPaint();
    const paintedAt = performance.now();
    const layout = await waitForLayoutToSettle(editor, recorder);
    const uploaded = await upload;
    const bytesSent = recorder.totals().bytesSent - bytesSentBefore;

    recorder.log(
      layout.timedOut || uploaded.status === "failed" ? "warning" : "success",
      `${operation.label}: ${formatCount(layout.pages)} pages`,
      [
        ...(prepared.details ?? []),
        { label: "Prepare", value: formatDuration(preparedAt - startedAt) },
        { label: "Apply", value: formatDuration(appliedAt - preparedAt) },
        { label: "First paint", value: formatDuration(paintedAt - appliedAt) },
        { label: "Layout settled", value: describeLayout(layout, appliedAt) },
        {
          label: "Cloud sync",
          value: describeUpload(uploaded, appliedAt, bytesSent),
        },
        {
          label: "Main thread",
          value: describeLongTasks(recorder.longTasksSince(startedAt)),
        },
        { label: "Blocks", value: blockCount(editor) },
        ...hiddenTabNote(layout),
      ],
    );
  } catch (error) {
    recorder.log("error", `${operation.label} failed`, [
      { label: "Error", value: errorMessage(error) },
    ]);
  } finally {
    recorder.update({ busy: null });
  }
}

/** Logs how long opening the document took, from page load until Pages settled. */
export async function measureInitialSync(
  editor: Editor,
  recorder: PerfRecorder,
): Promise<void> {
  if (recorder.busy) return;
  recorder.update({ busy: "Opening document" });
  const syncedAt = performance.now();

  try {
    const layout = await waitForLayoutToSettle(editor, recorder);
    recorder.log(
      "success",
      `Document opened: ${formatCount(layout.pages)} pages`,
      [
        {
          label: "Synced",
          value: `${formatDuration(syncedAt)} after page load`,
        },
        {
          label: "Received",
          value: formatBytes(recorder.totals().bytesReceived),
        },
        { label: "Layout settled", value: describeLayout(layout, syncedAt) },
        {
          label: "Main thread",
          value: describeLongTasks(recorder.longTasksSince(0)),
        },
        { label: "Blocks", value: blockCount(editor) },
        ...hiddenTabNote(layout),
      ],
    );
  } finally {
    recorder.update({ busy: null });
  }
}
