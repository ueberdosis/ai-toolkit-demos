export const BUTTON_CLASS =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border-none bg-[var(--gray-2)] px-2.5 py-1.5 text-sm font-medium text-[var(--black)] transition-all duration-200 hover:bg-[var(--gray-3)] disabled:cursor-not-allowed disabled:bg-[var(--gray-1)] disabled:text-[var(--gray-4)]";

export const SELECT_CLASS =
  "rounded-lg border border-[var(--gray-3)] bg-white px-2 py-1.5 text-sm text-[var(--black)] disabled:cursor-not-allowed disabled:text-[var(--gray-4)]";

/** Reserved for state. Always pair them with an icon and a text label, never color alone. */
export const STATUS_COLORS = {
  neutral: "#94a3b8",
  good: "#0ca30c",
  warning: "#fab219",
  critical: "#d03b3b",
};
