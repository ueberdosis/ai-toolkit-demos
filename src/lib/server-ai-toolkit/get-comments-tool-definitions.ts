import type z from "zod";
import { getTiptapCloudAiJwtToken } from "./get-tiptap-cloud-ai-jwt-token";

export interface CommentsOptions {
  documentId: string;
  apiSecret: string;
  userId: string;
  appId: string;
}

/**
 * Gets comments tool definitions from the Server AI Toolkit API
 */
export async function getCommentsToolDefinitions(
  schemaAwarenessData: unknown,
): Promise<
  {
    name: string;
    description: string;
    inputSchema: z.core.JSONSchema.JSONSchema;
  }[]
> {
  const apiBaseUrl =
    process.env.TIPTAP_CLOUD_AI_API_URL || "https://api.tiptap.dev/v3/ai";
  const appId = process.env.TIPTAP_CLOUD_AI_APP_ID;

  if (!appId) {
    throw new Error("Missing TIPTAP_CLOUD_AI_APP_ID");
  }

  const response = await fetch(`${apiBaseUrl}/toolkit/tools`, {
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
      tools: {
        // Disable tiptap read and edit tools
        tiptapRead: false,
        tiptapEdit: false,
        // Enable comments tools
        getThreads: true,
        editThreads: true,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tools: ${response.statusText}`);
  }
  const responseData = await response.json();

  return responseData.tools;
}
