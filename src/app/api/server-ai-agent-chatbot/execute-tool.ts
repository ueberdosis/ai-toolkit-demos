import { getTiptapCloudAiJwtToken } from "./get-tiptap-cloud-ai-jwt-token";

/**
 * Executes a tool via the Server AI Toolkit API
 */
export async function executeTool(
  toolName: string,
  input: unknown,
  document: unknown,
  schemaAwarenessData: unknown,
): Promise<{ output: unknown; docChanged: boolean; document?: unknown }> {
  const apiBaseUrl =
    process.env.TIPTAP_CLOUD_AI_API_URL || "https://api.tiptap.dev";
  const appId = process.env.TIPTAP_CLOUD_AI_APP_ID;

  if (!appId) {
    throw new Error("Missing TIPTAP_CLOUD_AI_APP_ID");
  }

  const response = await fetch(`${apiBaseUrl}/v2/toolkit/execute-tool`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getTiptapCloudAiJwtToken()}`,
      "X-App-Id": appId,
    },
    body: JSON.stringify({
      toolName,
      input,
      document,
      schemaAwarenessData,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tool execution failed: ${response.statusText}`);
  }

  return response.json();
}
