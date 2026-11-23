import type z from "zod";
import { getServerAiToolkitApiBaseUrl } from "./config";
import type { UniqueIdOptions } from "./execute-tool";
import { getTiptapCloudAiJwtToken } from "./get-tiptap-cloud-ai-jwt-token";

export interface GetToolsOptions {
  editorContext: unknown;
  operationMeta?: string;
  tools?: Record<string, boolean | Record<string, unknown>>;
  /** Rules for what the AI can read and edit. The system prompt explains them. */
  contentProtectionPolicy?: unknown;
  /** Settings of the editor's Unique ID extension. The system prompt leaves the ID attribute out. */
  uniqueId?: UniqueIdOptions;
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
  const apiBaseUrl = getServerAiToolkitApiBaseUrl();

  const response = await fetch(`${apiBaseUrl}/v4/ai/toolkit/fetch-tools`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getTiptapCloudAiJwtToken()}`,
    },
    body: JSON.stringify({
      editorContext: options.editorContext,
      tools: options.tools ?? {
        tiptapQuery: options.operationMeta
          ? { meta: options.operationMeta }
          : true,
      },
      ...(options.contentProtectionPolicy
        ? { contentProtectionPolicy: options.contentProtectionPolicy }
        : {}),
      ...(options.uniqueId ? { uniqueId: options.uniqueId } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch tools: ${response.status} ${response.statusText} - ${await response.text()}`,
    );
  }
  return response.json();
}
