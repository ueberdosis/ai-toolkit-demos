import { useSyncExternalStore } from "react";

export type LogLevel = "info" | "success" | "warning" | "error";

export interface LogDetail {
  label: string;
  value: string;
}

export interface LogEntry {
  id: number;
  /** `performance.now()`: milliseconds since the page started loading. */
  at: number;
  level: LogLevel;
  title: string;
  details: LogDetail[];
}

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "synced"
  | "disconnected";

export interface LiveStats {
  pages: number | null;
  blocks: number | null;
  pageFormat: string | null;
  heapBytes: number | null;
  connection: ConnectionStatus;
  unsyncedChanges: number;
  /** Label of the running measurement, if any. */
  busy: string | null;
}

export interface LatencyStats {
  count: number;
  p50: number;
  p95: number;
  max: number;
}

export interface LongTaskStats {
  count: number;
  totalMs: number;
  maxMs: number;
}

export interface PerfTotals {
  layoutPasses: number;
  lastLayoutPassAt: number;
  bytesSent: number;
  bytesReceived: number;
}

export interface PerfSnapshot extends LiveStats {
  keystrokes: LatencyStats | null;
  /** `null` when the browser can't observe long tasks (only Chromium can). */
  longTasks: LongTaskStats | null;
  layoutPasses: number;
  bytesSent: number;
  bytesReceived: number;
  /** Newest first. */
  entries: LogEntry[];
}

const MAX_ENTRIES = 200;
const MAX_SAMPLES = 1000;
const EMIT_INTERVAL_MS = 250;
const NO_LONG_TASKS: LongTaskStats = { count: 0, totalMs: 0, maxMs: 0 };

function pushBounded<T>(items: T[], item: T): void {
  items.push(item);
  if (items.length > MAX_SAMPLES) items.shift();
}

function summarizeLatencies(samples: number[]): LatencyStats | null {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const quantile = (q: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  return {
    count: sorted.length,
    p50: quantile(0.5),
    p95: quantile(0.95),
    max: sorted[sorted.length - 1],
  };
}

function addLongTask(stats: LongTaskStats, duration: number): LongTaskStats {
  return {
    count: stats.count + 1,
    totalMs: stats.totalMs + duration,
    maxMs: Math.max(stats.maxMs, duration),
  };
}

/**
 * Collects performance samples outside React state and publishes throttled
 * snapshots, so recording a keystroke or a Yjs update never re-renders the
 * editor it is measuring.
 */
export class PerfRecorder {
  private live: LiveStats = {
    pages: null,
    blocks: null,
    pageFormat: null,
    heapBytes: null,
    connection: "connecting",
    unsyncedChanges: 0,
    busy: null,
  };
  private keystrokeSamples: number[] = [];
  private longTaskSamples: Array<{ startTime: number; duration: number }> = [];
  private longTaskTotals: LongTaskStats | null = null;
  private layoutPasses = 0;
  private lastLayoutPassAt = 0;
  private bytesSent = 0;
  private bytesReceived = 0;
  private entries: LogEntry[] = [];
  private nextEntryId = 1;
  private listeners = new Set<() => void>();
  private emitTimer: ReturnType<typeof setTimeout> | null = null;
  private snapshot: PerfSnapshot = this.buildSnapshot();

  get busy(): string | null {
    return this.live.busy;
  }

  totals(): PerfTotals {
    return {
      layoutPasses: this.layoutPasses,
      lastLayoutPassAt: this.lastLayoutPassAt,
      bytesSent: this.bytesSent,
      bytesReceived: this.bytesReceived,
    };
  }

  log(level: LogLevel, title: string, details: LogDetail[] = []): void {
    const entry = {
      id: this.nextEntryId++,
      at: performance.now(),
      level,
      title,
      details,
    };
    this.entries = [entry, ...this.entries].slice(0, MAX_ENTRIES);
    this.scheduleEmit();
  }

  update(patch: Partial<LiveStats>): void {
    const keys = Object.keys(patch) as Array<keyof LiveStats>;
    if (keys.every((key) => this.live[key] === patch[key])) return;
    this.live = { ...this.live, ...patch };
    this.scheduleEmit();
  }

  recordKeystroke(latencyMs: number): void {
    pushBounded(this.keystrokeSamples, latencyMs);
    this.scheduleEmit();
  }

  /** Marks long tasks as observable, so stats show zero instead of "unsupported". */
  observeLongTasks(): void {
    this.longTaskTotals ??= NO_LONG_TASKS;
    this.scheduleEmit();
  }

  recordLongTask(startTime: number, duration: number): void {
    this.longTaskTotals = addLongTask(
      this.longTaskTotals ?? NO_LONG_TASKS,
      duration,
    );
    pushBounded(this.longTaskSamples, { startTime, duration });
    this.scheduleEmit();
  }

  /** Long tasks that started at or after `since`; `null` when long tasks aren't observable. */
  longTasksSince(since: number): LongTaskStats | null {
    if (!this.longTaskTotals) return null;
    return this.longTaskSamples
      .filter((task) => task.startTime >= since)
      .reduce(
        (stats, task) => addLongTask(stats, task.duration),
        NO_LONG_TASKS,
      );
  }

  recordLayoutPass(): void {
    this.layoutPasses += 1;
    this.lastLayoutPassAt = performance.now();
    this.scheduleEmit();
  }

  recordBytes(direction: "sent" | "received", bytes: number): void {
    if (direction === "sent") this.bytesSent += bytes;
    else this.bytesReceived += bytes;
    this.scheduleEmit();
  }

  /** Clears keystroke, long task, layout and traffic counters; keeps the log. */
  resetCounters(): void {
    this.keystrokeSamples = [];
    this.longTaskSamples = [];
    if (this.longTaskTotals) this.longTaskTotals = NO_LONG_TASKS;
    this.layoutPasses = 0;
    this.bytesSent = 0;
    this.bytesReceived = 0;
    this.scheduleEmit();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): PerfSnapshot => this.snapshot;

  private scheduleEmit(): void {
    if (this.emitTimer !== null) return;
    this.emitTimer = setTimeout(() => {
      this.emitTimer = null;
      this.snapshot = this.buildSnapshot();
      for (const listener of this.listeners) listener();
    }, EMIT_INTERVAL_MS);
  }

  private buildSnapshot(): PerfSnapshot {
    return {
      ...this.live,
      keystrokes: summarizeLatencies(this.keystrokeSamples),
      longTasks: this.longTaskTotals,
      layoutPasses: this.layoutPasses,
      bytesSent: this.bytesSent,
      bytesReceived: this.bytesReceived,
      entries: this.entries,
    };
  }
}

export function usePerfSnapshot(recorder: PerfRecorder): PerfSnapshot {
  return useSyncExternalStore(
    recorder.subscribe,
    recorder.getSnapshot,
    recorder.getSnapshot,
  );
}
