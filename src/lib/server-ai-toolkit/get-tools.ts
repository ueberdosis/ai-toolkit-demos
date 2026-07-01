import type z from "zod";
import { getTiptapCloudAiJwtToken } from "./get-tiptap-cloud-ai-jwt-token";

export interface GetToolsOptions {
  editorContext: unknown;
  operationMeta?: string;
  tools?: Record<string, boolean | Record<string, unknown>>;
}

/**
 * Gets tool definitions from the Server AI Toolkit API
 */
export async function getTools(options: GetToolsOptions): Promise<{
  systemPrompt: string;
  tools: {
    name: string;
    description: string;
    inputSchema: z.core.JSONSchema.JSONSchema;
  }[];
}> {
  const apiBaseUrl =
    process.env.TIPTAP_CLOUD_AI_API_URL || "https://api.tiptap.dev";

  const response = await fetch(`${apiBaseUrl}/v4/ai/toolkit/fetch-tools`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getTiptapCloudAiJwtToken()}`,
    },
    body: JSON.stringify({
      editorContext: options.editorContext,
      tools: options.tools ?? {
        tiptapRead: true,
        tiptapEdit: options.operationMeta
          ? { meta: options.operationMeta }
          : true,
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
