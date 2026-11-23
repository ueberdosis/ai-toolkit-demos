import type { UniqueIdOptions } from "@/lib/server-ai-toolkit/execute-tool";

/** Shared by the editor's Unique ID extension and the AI requests, so both use the same settings. */
export const uniqueIdOptions = {
  attributeName: "id",
  types: ["heading", "paragraph", "listItem"],
} satisfies UniqueIdOptions;

export type ToolSet = "tiptapEdit" | "tiptapQuery" | "replaceDocument";

export type ReviewMode = "disabled" | "trackedChanges";
