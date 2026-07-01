import type { CommentsOptions } from "./get-comments-tool-definitions";
import { getTiptapCloudAiJwtToken } from "./get-tiptap-cloud-ai-jwt-token";

/**
 * Executes a comments tool via the Server AI Toolkit API
 */
export async function executeCommentsTool(
  toolName: string,
  input: unknown,
  editorContext: unknown,
  commentsOptions: CommentsOptions,
): Promise<{
  output: unknown;
  toolResult: unknown;
  docChanged: boolean;
  document?: unknown;
}> {
  const apiBaseUrl =
    process.env.TIPTAP_CLOUD_AI_API_URL || "https://api.tiptap.dev";

  const response = await fetch(`${apiBaseUrl}/v4/ai/toolkit/execute-tool`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getTiptapCloudAiJwtToken({
        documentId: commentsOptions.documentId,
      })}`,
    },
    body: JSON.stringify({
      editorContext,
      document: {
        type: "cloud",
        id: commentsOptions.documentId,
      },
      user: commentsOptions.userId,
      tool: {
        name: toolName,
        input,
        config: {
          threadData: { userName: "Tiptap AI" },
          commentData: { userName: "Tiptap AI" },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Tool execution failed: ${response.status} ${response.statusText} - ${await response.text()}`,
    );
  }

  const responseData = await response.json();

  return {
    output: responseData.tool.output,
    toolResult: responseData.tool,
    docChanged: responseData.docChanged,
    document: responseData.document,
  };
}
