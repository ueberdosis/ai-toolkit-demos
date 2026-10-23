"use client";

import {
  CircleCheck,
  CircleX,
  Copy,
  Info,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import {
  formatBytes,
  formatCount,
  formatDuration,
  formatTimestamp,
} from "./format";
import {
  type LogEntry,
  type LogLevel,
  type PerfRecorder,
  type PerfSnapshot,
  usePerfSnapshot,
} from "./perf-recorder";
import { BUTTON_CLASS, STATUS_COLORS } from "./ui-tokens";

const LEVEL_ICONS: Record<LogLevel, typeof Info> = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleX,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  info: STATUS_COLORS.neutral,
  success: STATUS_COLORS.good,
  warning: STATUS_COLORS.warning,
  error: STATUS_COLORS.critical,
};

interface Stat {
  label: string;
  value: string;
  detail: string;
}

function buildStats(snapshot: PerfSnapshot): Stat[] {
  const { keystrokes, longTasks, heapBytes } = snapshot;
  return [
    {
      label: "Pages",
      value: formatCount(snapshot.pages),
      detail: `${snapshot.pageFormat ?? "–"}, ${formatCount(snapshot.blocks)} blocks`,
    },
    {
      label: "Keystroke latency p95",
      value: keystrokes ? formatDuration(keystrokes.p95) : "–",
      detail: keystrokes
        ? `p50 ${formatDuration(keystrokes.p50)}, max ${formatDuration(keystrokes.max)}, last ${formatCount(keystrokes.count)}`
        : "type in the editor to measure",
    },
    {
      label: "Long tasks",
      value: longTasks ? formatCount(longTasks.count) : "n/a",
      detail: longTasks
        ? `longest ${formatDuration(longTasks.maxMs)}, total ${formatDuration(longTasks.totalMs)}`
        : "Chromium only",
    },
    {
      label: "JS heap",
      value: heapBytes === null ? "n/a" : formatBytes(heapBytes),
      detail: heapBytes === null ? "Chromium only" : "used heap",
    },
    {
      label: "Layout passes",
      value: formatCount(snapshot.layoutPasses),
      detail: "Pages pagination",
    },
    {
      label: "Yjs sent",
      value: formatBytes(snapshot.bytesSent),
      detail: `${formatBytes(snapshot.bytesReceived)} received`,
    },
  ];
}

function buildReport(snapshot: PerfSnapshot, documentId: string): string {
  const { deviceMemory } = navigator as Navigator & { deviceMemory?: number };
  return [
    "Tiptap Pages + Server AI Toolkit performance report",
    `Document: ${documentId}`,
    `Browser: ${navigator.userAgent}`,
    `CPU cores: ${navigator.hardwareConcurrency}${deviceMemory ? `, device memory: ${deviceMemory} GB` : ""}`,
    "",
    ...buildStats(snapshot).map(
      (stat) => `${stat.label}: ${stat.value} (${stat.detail})`,
    ),
    "",
    "Events, oldest first:",
    ...[...snapshot.entries]
      .reverse()
      .flatMap((entry) => [
        `${formatTimestamp(entry.at)} [${entry.level}] ${entry.title}`,
        ...entry.details.map((detail) => `  ${detail.label}: ${detail.value}`),
      ]),
  ].join("\n");
}

function StatTile({ label, value, detail }: Stat) {
  return (
    <div className="rounded-lg bg-[var(--gray-1)] px-3 py-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-semibold text-slate-900">{value}</div>
      <div className="truncate text-xs text-slate-500" title={detail}>
        {detail}
      </div>
    </div>
  );
}

function LogItem({ entry }: { entry: LogEntry }) {
  const Icon = LEVEL_ICONS[entry.level];
  return (
    <li className="border-b border-slate-100 py-2 last:border-b-0">
      <div className="flex items-start gap-2">
        <Icon
          size={14}
          color={LEVEL_COLORS[entry.level]}
          className="mt-0.5 shrink-0"
          aria-label={entry.level}
        />
        <span className="text-sm font-medium text-slate-900">
          {entry.title}
        </span>
        <span className="ml-auto shrink-0 text-xs text-slate-500 tabular-nums">
          {formatTimestamp(entry.at)}
        </span>
      </div>
      {entry.details.length > 0 && (
        <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 pl-[22px] text-xs">
          {entry.details.map((detail) => (
            <div key={detail.label} className="contents">
              <dt className="text-slate-500">{detail.label}</dt>
              <dd className="text-slate-700 tabular-nums">{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  );
}

interface MetricsPanelProps {
  recorder: PerfRecorder;
  documentId: string;
}

export function MetricsPanel({ recorder, documentId }: MetricsPanelProps) {
  const snapshot = usePerfSnapshot(recorder);
  const [copyLabel, setCopyLabel] = useState("Copy report");

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(buildReport(snapshot, documentId));
      setCopyLabel("Copied");
    } catch {
      setCopyLabel("Copy failed");
    }
    setTimeout(() => setCopyLabel("Copy report"), 1500);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-2 gap-2 border-b border-slate-200 p-4">
        {buildStats(snapshot).map((stat) => (
          <StatTile key={stat.label} {...stat} />
        ))}
      </div>

      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <h2 className="text-sm font-medium text-slate-900">Event log</h2>
        <button
          type="button"
          className={`${BUTTON_CLASS} ml-auto`}
          disabled={snapshot.busy !== null}
          onClick={() => recorder.resetCounters()}
        >
          <RotateCcw size={14} /> Reset counters
        </button>
        <button type="button" className={BUTTON_CLASS} onClick={copyReport}>
          <Copy size={14} /> {copyLabel}
        </button>
      </div>

      <ol className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {snapshot.entries.length === 0 ? (
          <li className="py-6 text-center text-sm text-slate-400">
            Generate or import a document to start measuring
          </li>
        ) : (
          snapshot.entries.map((entry) => (
            <LogItem key={entry.id} entry={entry} />
          ))
        )}
      </ol>
    </div>
  );
}
