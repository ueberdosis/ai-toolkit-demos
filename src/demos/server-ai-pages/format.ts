export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes} min ${seconds.toString().padStart(2, "0")} s`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

export function formatCount(value: number | null): string {
  return value === null ? "–" : value.toLocaleString("en-US");
}

/** Formats a `performance.now()` timestamp as time since the page started loading. */
export function formatTimestamp(ms: number): string {
  return `+${(ms / 1000).toFixed(1)} s`;
}

const CLOSE_CODE_REASONS: Record<number, string> = {
  1006: "connection dropped",
  1009: "message too big",
  1011: "server error",
};

export function describeCloseEvent(event: CloseEvent): string {
  const reason = event.reason || CLOSE_CODE_REASONS[event.code];
  return reason ? `code ${event.code}, ${reason}` : `code ${event.code}`;
}
