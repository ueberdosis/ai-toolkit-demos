import { getTiptapCloudAiJwtToken } from "./get-tiptap-cloud-ai-jwt-token";

/**
 * Gets the schema awareness prompt from the Server AI Toolkit API
 */
export async function getSchemaAwarenessPrompt(
  schemaAwarenessData: unknown,
): Promise<string> {
  const apiBaseUrl =
    process.env.TIPTAP_CLOUD_AI_API_URL || "https://api.tiptap.dev/v3/ai";
  const appId = process.env.TIPTAP_CLOUD_AI_APP_ID;

  if (!appId) {
    throw new Error("Missing TIPTAP_CLOUD_AI_APP_ID");
  }

  const response = await fetch(
    `${apiBaseUrl}/toolkit/schema-awareness-prompt`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getTiptapCloudAiJwtToken()}`,
        "X-App-Id": appId,
        // Set allowed origins to avoid CORS errors (due to the setup in Tiptap Cloud)
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        schemaAwarenessData,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch schema awareness prompt: ${response.statusText}`,
    );
  }

  const result: { prompt: string } = await response.json();
  return result.prompt;
}
