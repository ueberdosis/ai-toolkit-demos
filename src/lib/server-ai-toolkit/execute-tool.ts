import { getTiptapCloudAiJwtToken } from "./get-tiptap-cloud-ai-jwt-token";

export interface ExecuteToolOptions {
  documentId?: string;
  userId?: string;
  sessionId?: string;
  reviewOptions?: {
    mode?: "disabled" | "trackedChanges";
  };
  commentsOptions?: {
    threadData?: Record<string, unknown>;
    commentData?: Record<string, unknown>;
  };
}

/**
 * Executes a tool via the Server AI Toolkit API
 */
export async function executeTool(
  toolName: string,
  input: unknown,
  document: unknown,
  schemaAwarenessData: unknown,
  options: ExecuteToolOptions = {},
): Promise<{
  output: unknown;
  docChanged: boolean;
  document?: unknown;
  sessionId: string;
}> {
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
      Authorization: `Bearer ${getTiptapCloudAiJwtToken()}`,
      "X-App-Id": appId,
      // Set allowed origins to avoid CORS errors (due to the setup in Tiptap Cloud)
      Origin: "http://localhost:3000",
    },
    body: JSON.stringify({
      toolName,
      input,
      schemaAwarenessData,
      sessionId: options.sessionId,
      ...(options.documentId
        ? {
            experimental_documentOptions: {
              documentId: options.documentId,
              userId: options.userId ?? null,
            },
          }
        : { document }),
      ...(options.reviewOptions
        ? { reviewOptions: options.reviewOptions }
        : {}),
      ...(options.commentsOptions
        ? { experimental_commentsOptions: options.commentsOptions }
        : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Tool execution failed: ${response.statusText}`);
  }

  return response.json();
}
