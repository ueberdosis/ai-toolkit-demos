import type { Editor } from "@tiptap/core";
import type { TiptapCollabProvider } from "@tiptap-pro/provider";
import type * as Y from "yjs";
import { describeCloseEvent, formatBytes, formatDuration } from "./format";
import type { ConnectionStatus, PerfRecorder } from "./perf-recorder";

const SAMPLE_INTERVAL_MS = 1000;
const LARGE_REMOTE_UPDATE_BYTES = 64 * 1024;
const SLOW_REMOTE_UPDATE_MS = 50;

type PerformanceWithMemory = Performance & {
  memory?: { usedJSHeapSize: number };
};

/** Observes main-thread long tasks; a no-op where the browser can't report them. */
export function instrumentLongTasks(recorder: PerfRecorder): () => void {
  if (
    typeof PerformanceObserver === "undefined" ||
    !PerformanceObserver.supportedEntryTypes.includes("longtask")
  ) {
    return () => {};
  }

  recorder.observeLongTasks();
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      recorder.recordLongTask(entry.startTime, entry.duration);
    }
  });
  observer.observe({ type: "longtask" });
  return () => observer.disconnect();
}

/** Records keystroke latency, Pages layout passes, and live document stats for one editor. */
export function instrumentEditor(
  editor: Editor,
  recorder: PerfRecorder,
): () => void {
  const dom = editor.view.dom;

  // Keydown until the first task after the next frame: the transaction, DOM update, layout and paint.
  const onKeyDown = () => {
    const startedAt = performance.now();
    requestAnimationFrame(() => {
      setTimeout(
        () => recorder.recordKeystroke(performance.now() - startedAt),
        0,
      );
    });
  };
  dom.addEventListener("keydown", onKeyDown, true);

  // The editor root sorts before every other participant, so Pages calls this first in each layout pass.
  const participant = editor.storage.pages?.registerLayoutParticipant?.({
    element: dom,
    layout: () => {
      recorder.recordLayoutPass();
      return false;
    },
  });

  const sample = () => {
    if (editor.isDestroyed) return;
    const pages = editor.storage.pages;
    const pageFormat = pages?.pageFormat;
    recorder.update({
      pages: pages?.getPageCount?.() ?? null,
      blocks: editor.state.doc.childCount,
      pageFormat:
        typeof pageFormat === "string" ? pageFormat : (pageFormat?.id ?? null),
      heapBytes:
        (performance as PerformanceWithMemory).memory?.usedJSHeapSize ?? null,
    });
  };
  sample();
  const interval = setInterval(sample, SAMPLE_INTERVAL_MS);

  return () => {
    dom.removeEventListener("keydown", onKeyDown, true);
    participant?.dispose();
    clearInterval(interval);
  };
}

/** Records connection state, sync progress, and Yjs traffic for one provider. */
export function instrumentCollaboration(
  provider: TiptapCollabProvider,
  recorder: PerfRecorder,
): () => void {
  const doc = provider.document;
  const transactionStarts = new WeakMap<Y.Transaction, number>();
  const transactionDurations = new WeakMap<Y.Transaction, number>();

  const onBeforeTransaction = (transaction: Y.Transaction) => {
    transactionStarts.set(transaction, performance.now());
  };
  // For remote transactions this includes y-prosemirror rebuilding the editor state and DOM.
  const onAfterTransaction = (transaction: Y.Transaction) => {
    const startedAt = transactionStarts.get(transaction);
    if (startedAt !== undefined) {
      transactionDurations.set(transaction, performance.now() - startedAt);
    }
  };
  const onUpdate = (
    update: Uint8Array,
    _origin: unknown,
    _doc: Y.Doc,
    transaction: Y.Transaction,
  ) => {
    if (transaction.local) {
      recorder.recordBytes("sent", update.byteLength);
      return;
    }
    recorder.recordBytes("received", update.byteLength);
    const duration = transactionDurations.get(transaction) ?? 0;
    if (
      update.byteLength >= LARGE_REMOTE_UPDATE_BYTES ||
      duration >= SLOW_REMOTE_UPDATE_MS
    ) {
      recorder.log("info", "Remote change applied", [
        { label: "Size", value: formatBytes(update.byteLength) },
        { label: "Apply", value: formatDuration(duration) },
      ]);
    }
  };

  const toConnectionStatus = (status: string): ConnectionStatus => {
    if (status === "connected") {
      return provider.isSynced ? "synced" : "connected";
    }
    return status === "connecting" ? "connecting" : "disconnected";
  };
  const onStatus = ({ status }: { status: string }) => {
    recorder.update({ connection: toConnectionStatus(status) });
  };
  const onSynced = () => recorder.update({ connection: "synced" });
  const onUnsyncedChanges = ({ number }: { number: number }) => {
    recorder.update({ unsyncedChanges: number });
  };
  const onClose = ({ event }: { event: CloseEvent }) => {
    recorder.update({ connection: "disconnected" });
    recorder.log("warning", "Collaboration connection closed", [
      { label: "Reason", value: describeCloseEvent(event) },
    ]);
  };
  const onAuthenticationFailed = ({ reason }: { reason: string }) => {
    recorder.log("error", "Collaboration authentication failed", [
      { label: "Reason", value: reason },
    ]);
  };

  recorder.update({
    connection: provider.isSynced ? "synced" : "connecting",
    unsyncedChanges: provider.unsyncedChanges,
  });
  doc.on("beforeTransaction", onBeforeTransaction);
  doc.on("afterTransaction", onAfterTransaction);
  doc.on("update", onUpdate);
  provider.on("status", onStatus);
  provider.on("synced", onSynced);
  provider.on("unsyncedChanges", onUnsyncedChanges);
  provider.on("close", onClose);
  provider.on("authenticationFailed", onAuthenticationFailed);

  return () => {
    doc.off("beforeTransaction", onBeforeTransaction);
    doc.off("afterTransaction", onAfterTransaction);
    doc.off("update", onUpdate);
    provider.off("status", onStatus);
    provider.off("synced", onSynced);
    provider.off("unsyncedChanges", onUnsyncedChanges);
    provider.off("close", onClose);
    provider.off("authenticationFailed", onAuthenticationFailed);
  };
}
