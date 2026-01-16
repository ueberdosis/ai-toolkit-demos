import type z from "zod";
import { getJwtToken } from "./get-ai-jwt-token";

/**
 * Gets tool definitions from the Server AI Toolkit API
 */
export async function getToolDefinitions(schemaAwarenessData: unknown): Promise<
  {
    name: string;
    description: string;
    inputSchema: z.core.JSONSchema.JSONSchema;
  }[]
> {
  const apiBaseUrl =
    process.env.TIPTAP_CLOUD_AI_API_URL || "https://api.tiptap.dev";
  const appId = process.env.TIPTAP_CLOUD_AI_APP_ID;

  if (!appId) {
    throw new Error("Missing TIPTAP_CLOUD_AI_APP_ID");
  }

  const response = await fetch(`${apiBaseUrl}/v2/toolkit/tools`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getJwtToken()}`,
      "X-App-Id": appId,
    },
    body: JSON.stringify({
      schemaAwarenessData,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tools: ${response.statusText}`);
  }
  const responseData = await response.json();

  return responseData.tools;
}
