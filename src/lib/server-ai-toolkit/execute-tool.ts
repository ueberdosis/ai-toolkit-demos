import { getTiptapCloudAiJwtToken } from "./get-tiptap-cloud-ai-jwt-token";

export interface ExecuteToolOptions {
  documentId?: string;
  userId?: string;
  toolConfig?: Record<string, unknown>;
  reviewOptions?: {
    mode?: "disabled" | "trackedChanges";
  };
  commentsOptions?: {
    threadData?: Record<string, unknown>;
    commentData?: Record<string, unknown>;
  };
}

/**
 * Executes a tool via the Server AI Toolkit API.
 *
 * Single JWT model (access-control flow): the JWT minted by
 * `getTiptapCloudAiJwtToken` carries `aud: ["AI", "Documents"]` so the same
 * token authenticates both the AI server call and the Hocuspocus session the
 * AI server opens on the user's behalf.
 */
export async function executeTool(
  toolName: string,
  input: unknown,
  document: unknown,
  editorContext: unknown,
  options: ExecuteToolOptions = {},
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
        documentId: options.documentId,
      })}`,
    },
    body: JSON.stringify({
      editorContext,
      document: options.documentId
        ? {
            type: "cloud",
            id: options.documentId,
          }
        : {
            type: "inline",
            content: document,
          },
      user: options.userId ?? null,
      tool: {
        name: toolName,
        input,
        config: {
          ...options.toolConfig,
          ...options.commentsOptions,
        },
      },
      ...(options.reviewOptions
        ? { reviewOptions: options.reviewOptions }
        : {}),
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
