import { randomUUID } from "node:crypto";
import { workspaceDocumentName } from "./clinical-workspace-session";
import { executeTool } from "./server-ai-toolkit/execute-tool";
import type { WorkspaceDocument } from "./workspace-documents";

/** Allocate a fresh cloud document; the Toolkit validates and inserts its content. */
export async function createWorkspaceDocument(options: {
  title: string;
  mention: string;
  input: unknown;
  sessionId: string;
  workspaceToken: string;
  editorContext: unknown;
}): Promise<{ document?: WorkspaceDocument; result: unknown }> {
  const id = randomUUID();
  const result = await executeTool(
    "createDocument",
    options.input,
    null,
    options.editorContext,
    {
      documentId: workspaceDocumentName(options.sessionId, id),
      workspaceToken: options.workspaceToken,
      userId: "ai-assistant",
      reviewOptions: { mode: "trackedChanges" },
      commentsOptions: {
        threadData: { userName: "Tiptap AI" },
        commentData: { userName: "Tiptap AI" },
      },
    },
  );
  const output = result.output as { success?: boolean } | null;
  return {
    ...(output?.success === true
      ? {
          document: {
            id,
            title: options.title,
            mention: options.mention,
            detail: "AI draft · awaiting review",
          },
        }
      : {}),
    result: result.output,
  };
}
