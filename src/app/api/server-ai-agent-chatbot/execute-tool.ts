import { API_BASE_URL, APP_ID, JWT_TOKEN } from "./constants";

/**
 * Executes a tool via the Server AI Toolkit API
 */
export async function executeTool(
  toolName: string,
  input: unknown,
  document: unknown,
  schemaAwarenessData: unknown,
): Promise<{ output: unknown; docChanged: boolean; document?: unknown }> {
  const response = await fetch(`${API_BASE_URL}/v2/toolkit/execute-tool`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${JWT_TOKEN}`,
      "X-App-Id": APP_ID || "",
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
