import { getTiptapCloudAiJwtToken } from "./get-tiptap-cloud-ai-jwt-token";

/**
 * Creates a Server AI Toolkit session and returns the generated session id.
 */
export async function createSession(): Promise<string> {
  const apiBaseUrl =
    process.env.TIPTAP_CLOUD_AI_API_URL || "https://api.tiptap.dev/v3/ai";
  const appId = process.env.TIPTAP_CLOUD_AI_APP_ID;

  if (!appId) {
    throw new Error("Missing TIPTAP_CLOUD_AI_APP_ID");
  }

  const response = await fetch(`${apiBaseUrl}/toolkit/create-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getTiptapCloudAiJwtToken()}`,
      "X-App-Id": appId,
      Origin: "http://localhost:3000",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.statusText}`);
  }

  const responseData = (await response.json()) as { sessionId: string };

  return responseData.sessionId;
}
