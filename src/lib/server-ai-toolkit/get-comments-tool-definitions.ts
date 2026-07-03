import type z from "zod";
import { getServerAiToolkitApiBaseUrl } from "./config";
import { getTiptapCloudAiJwtToken } from "./get-tiptap-cloud-ai-jwt-token";

export interface CommentsOptions {
  documentId: string;
  userId: string;
}

/**
 * Gets comments tool definitions from the Server AI Toolkit API
 */
export async function getCommentsToolDefinitions(
  editorContext: unknown,
): Promise<{
  systemPrompt: string;
  tools: {
    name: string;
    description: string;
    inputSchema: z.core.JSONSchema.JSONSchema;
  }[];
}> {
  const apiBaseUrl = getServerAiToolkitApiBaseUrl();

  const response = await fetch(`${apiBaseUrl}/v4/ai/toolkit/fetch-tools`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getTiptapCloudAiJwtToken()}`,
    },
    body: JSON.stringify({
      editorContext,
      tools: {
        tiptapRead: true,
        getThreads: true,
        editThreads: true,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch tools: ${response.status} ${response.statusText} - ${await response.text()}`,
    );
  }
  return response.json();
}
