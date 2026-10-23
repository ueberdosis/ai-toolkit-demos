"use client";

import {
  CircleCheck,
  CloudOff,
  CloudUpload,
  Download,
  FilePlus,
  FileUp,
  Link2,
  Loader2,
  RefreshCw,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { ToolbarPanel } from "@/components/toolbar-panel";
import { REPEAT_OPTIONS, SUPPORTED_FILE_TYPES } from "./document-sources";
import { formatCount } from "./format";
import { PAGE_FORMAT_OPTIONS, type PageFormatOption } from "./pages-extensions";
import {
  type ConnectionStatus,
  type PerfRecorder,
  usePerfSnapshot,
} from "./perf-recorder";
import { BUTTON_CLASS, SELECT_CLASS, STATUS_COLORS } from "./ui-tokens";

const PAGE_PRESETS = [10, 100, 1000, 5000, 10000];

function ConnectionBadge({
  connection,
  unsyncedChanges,
}: {
  connection: ConnectionStatus;
  unsyncedChanges: number;
}) {
  let icon: ReactNode;
  let label: string;
  if (connection === "disconnected") {
    icon = <CloudOff size={14} color={STATUS_COLORS.critical} />;
    label = "Disconnected";
  } else if (connection !== "synced") {
    icon = <RefreshCw size={14} color={STATUS_COLORS.warning} />;
    label = connection === "connecting" ? "Connecting" : "Syncing";
  } else if (unsyncedChanges > 0) {
    icon = <CloudUpload size={14} color={STATUS_COLORS.warning} />;
    label = `Uploading ${formatCount(unsyncedChanges)} ${unsyncedChanges === 1 ? "change" : "changes"}`;
  } else {
    icon = <CircleCheck size={14} color={STATUS_COLORS.good} />;
    label = "Synced";
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
      {icon}
      {label}
    </span>
  );
}

interface PagesToolbarProps {
  recorder: PerfRecorder;
  canImportDocx: boolean;
  onGenerate: (pages: number) => void;
  onImportFile: (file: File, repeat: number) => void;
  onPageFormatChange: (pageFormat: PageFormatOption) => void;
  onExport: () => void;
  onClear: () => void;
}

export function PagesToolbar({
  recorder,
  canImportDocx,
  onGenerate,
  onImportFile,
  onPageFormatChange,
  onExport,
  onClear,
}: PagesToolbarProps) {
  const snapshot = usePerfSnapshot(recorder);
  const [pages, setPages] = useState(1000);
  const [repeat, setRepeat] = useState(1);
  const [linkLabel, setLinkLabel] = useState("Copy link");
  const fileInput = useRef<HTMLInputElement>(null);
  const isBusy = snapshot.busy !== null;
  const pageFormat = snapshot.pageFormat ?? PAGE_FORMAT_OPTIONS[0];
  const isPresetFormat = PAGE_FORMAT_OPTIONS.some(
    (format) => format === pageFormat,
  );
  const acceptedTypes = SUPPORTED_FILE_TYPES.filter(
    (type) => canImportDocx || type !== ".docx",
  );

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkLabel("Copied");
    } catch {
      setLinkLabel("Copy failed");
    }
    setTimeout(() => setLinkLabel("Copy link"), 1500);
  };

  return (
    <ToolbarPanel>
      <select
        aria-label="Pages to generate"
        className={SELECT_CLASS}
        value={pages}
        disabled={isBusy}
        onChange={(event) => setPages(Number(event.target.value))}
      >
        {PAGE_PRESETS.map((preset) => (
          <option key={preset} value={preset}>
            ~{formatCount(preset)} pages
          </option>
        ))}
      </select>
      <button
        type="button"
        className={BUTTON_CLASS}
        disabled={isBusy}
        onClick={() => onGenerate(pages)}
      >
        <WandSparkles size={14} /> Generate
      </button>
      <button
        type="button"
        className={BUTTON_CLASS}
        disabled={isBusy}
        onClick={() => fileInput.current?.click()}
        title={
          canImportDocx
            ? `Supports ${acceptedTypes.join(", ")}`
            : `Supports ${acceptedTypes.join(", ")}. DOCX needs a Conversion token, see the Metrics log.`
        }
      >
        <FileUp size={14} /> Import file
      </button>
      <input
        ref={fileInput}
        type="file"
        hidden
        accept={acceptedTypes.join(",")}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onImportFile(file, repeat);
        }}
      />
      <select
        aria-label="Repeat imported content"
        title="Repeats the imported content to build a larger document (PDF, JSON, and HTML)"
        className={SELECT_CLASS}
        value={repeat}
        disabled={isBusy}
        onChange={(event) => setRepeat(Number(event.target.value))}
      >
        {REPEAT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            ×{option}
          </option>
        ))}
      </select>
      <select
        aria-label="Page format"
        className={SELECT_CLASS}
        value={pageFormat}
        disabled={isBusy}
        onChange={(event) =>
          onPageFormatChange(event.target.value as PageFormatOption)
        }
      >
        {/* A DOCX import can set a format outside the presets, e.g. its own page size. */}
        {!isPresetFormat && (
          <option value={pageFormat} disabled>
            {pageFormat}
          </option>
        )}
        {PAGE_FORMAT_OPTIONS.map((format) => (
          <option key={format} value={format}>
            {format}
          </option>
        ))}
      </select>
      <button
        type="button"
        className={BUTTON_CLASS}
        disabled={isBusy}
        onClick={onExport}
      >
        <Download size={14} /> Export JSON
      </button>
      <button
        type="button"
        className={BUTTON_CLASS}
        disabled={isBusy}
        onClick={onClear}
      >
        <Trash2 size={14} /> Clear
      </button>

      <div className="ml-auto flex items-center gap-3">
        {isBusy && (
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
            <Loader2 className="animate-spin" size={14} />
            {snapshot.busy}
          </span>
        )}
        <ConnectionBadge
          connection={snapshot.connection}
          unsyncedChanges={snapshot.unsyncedChanges}
        />
        <button type="button" className={BUTTON_CLASS} onClick={copyLink}>
          <Link2 size={14} /> {linkLabel}
        </button>
        <a className={BUTTON_CLASS} href={window.location.pathname}>
          <FilePlus size={14} /> New document
        </a>
      </div>
    </ToolbarPanel>
  );
}
