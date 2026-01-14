import type z from "zod";
import { API_BASE_URL, APP_ID, JWT_TOKEN } from "./constants";

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
  const response = await fetch(`${API_BASE_URL}/v2/toolkit/tools`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${JWT_TOKEN}`,
      "X-App-Id": APP_ID || "",
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
