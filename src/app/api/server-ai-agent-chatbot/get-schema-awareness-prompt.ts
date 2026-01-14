import { API_BASE_URL, APP_ID, JWT_TOKEN } from "./constants";

/**
 * Gets the schema awareness prompt from the Server AI Toolkit API
 */
export async function getSchemaAwarenessPrompt(
  schemaAwarenessData: unknown,
): Promise<string> {
  const response = await fetch(
    `${API_BASE_URL}/v2/toolkit/schema-awareness-prompt`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${JWT_TOKEN}`,
        "X-App-Id": APP_ID || "",
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
