import type { CommentsOptions } from "./get-comments-tool-definitions";
import { getTiptapCloudAiJwtTokenComments } from "./get-tiptap-cloud-ai-jwt-token-comments";

/**
 * Executes a comments tool via the Server AI Toolkit API
 */
export async function executeCommentsTool(
  toolName: string,
  input: unknown,
  // TODO remove this property
  _document: unknown,
  schemaAwarenessData: unknown,
  commentsOptions: CommentsOptions,
): Promise<{ output: unknown; docChanged: boolean; document?: unknown }> {
  const apiBaseUrl =
    process.env.TIPTAP_CLOUD_AI_API_URL || "https://api.tiptap.dev/v3/ai";
  const appId = process.env.TIPTAP_CLOUD_AI_APP_ID;

  if (!appId) {
    throw new Error("Missing TIPTAP_CLOUD_AI_APP_ID");
  }

  const response = await fetch(`${apiBaseUrl}/toolkit/execute-tool`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getTiptapCloudAiJwtTokenComments()}`,
      "X-App-Id": appId,
      // Set allowed origins to avoid CORS errors (due to the setup in Tiptap Cloud)
      Origin: "http://localhost:3000",
    },
    body: JSON.stringify({
      toolName,
      input,
      // document,
      schemaAwarenessData,
      experimental_documentOptions: {
        documentId: commentsOptions.documentId,
        userId: commentsOptions.userId,
      },
      experimental_commentsOptions: {
        threadData: { userName: "Tiptap AI" },
        commentData: { userName: "Tiptap AI" },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Tool execution failed: ${response.statusText}`);
  }

  return response.json();
}
