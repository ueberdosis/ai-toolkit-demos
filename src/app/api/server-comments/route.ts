import { devToolsMiddleware } from "@ai-sdk/devtools";
import { openai } from "@ai-sdk/openai";
import {
  createAgentUIStreamResponse,
  ToolLoopAgent,
  tool,
  type UIMessage,
  wrapLanguageModel,
} from "ai";
import z from "zod";
import { getIp, rateLimit } from "@/lib/rate-limit";
import { executeCommentsTool } from "@/lib/server-ai-toolkit/execute-comments-tool";
import { getCommentsToolDefinitions } from "@/lib/server-ai-toolkit/get-comments-tool-definitions";
import { getDocument } from "@/lib/server-ai-toolkit/get-document";
import { getSchemaAwarenessPrompt } from "@/lib/server-ai-toolkit/get-schema-awareness-prompt";
import { updateDocument } from "@/lib/server-ai-toolkit/update-document";

const collabBaseUrl = process.env.TIPTAP_CLOUD_COLLAB_BASE_URL;

export async function POST(req: Request) {
  // Rate limiting
  if (process.env.UPSTASH_REDIS_REST_URL) {
    const ip = await getIp();
    const isAllowed = await rateLimit(ip);

    if (!isAllowed) {
      return new Response("Rate limit exceeded. Please try again later.", {
        status: 429,
        headers: {
          "Content-Type": "text/plain",
        },
      });
    }
  }

  const {
    messages,
    schemaAwarenessData,
    documentId,
  }: {
    messages: UIMessage[];
    schemaAwarenessData: unknown;
    documentId: string;
  } = await req.json();

  const tiptapCloudAppId = process.env.TIPTAP_CLOUD_APP_ID;
  const documentManagementApiSecret =
    process.env.TIPTAP_CLOUD_DOCUMENT_MANAGEMENT_API_SECRET;

  if (!tiptapCloudAppId) {
    throw new Error("Missing TIPTAP_CLOUD_APP_ID");
  }

  if (!documentManagementApiSecret) {
    throw new Error("Missing TIPTAP_CLOUD_DOCUMENT_MANAGEMENT_API_SECRET");
  }

  const commentsOptions = {
    documentId,
    apiSecret: documentManagementApiSecret,
    userId: "ai-assistant",
    appId: tiptapCloudAppId,
  };

  // Get tool definitions from the Server AI Toolkit API (with comments tools)
  const toolDefinitions = await getCommentsToolDefinitions(schemaAwarenessData);

  // Get schema awareness prompt from the Server AI Toolkit API
  const schemaAwarenessPrompt =
    await getSchemaAwarenessPrompt(schemaAwarenessData);

  // Convert API tool definitions to AI SDK tool format
  const tools = Object.fromEntries(
    toolDefinitions.map((toolDef) => [
      toolDef.name,
      tool({
        description: toolDef.description,
        inputSchema: z.fromJSONSchema(toolDef.inputSchema),
        execute: async (input) => {
          try {
            // Get the latest version of the document before executing the tool
            const document = await getDocument(documentId, collabBaseUrl);

            const result = await executeCommentsTool(
              toolDef.name,
              input,
              document,
              schemaAwarenessData,
              commentsOptions,
            );

            // Update the document after executing the tool if it changed
            if (result.docChanged && result.document && documentId) {
              await updateDocument(documentId, result.document, collabBaseUrl);
            }

            return result.output;
          } catch (error) {
            console.error(`Failed to execute tool ${toolDef.name}:`, error);
            return {
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        },
      }),
    ]),
  );

  const model = wrapLanguageModel({
    model: openai("gpt-5-mini"),
    middleware:
      process.env.NODE_ENV === "production" ? [] : devToolsMiddleware(),
  });

  const agent = new ToolLoopAgent({
    model,
    instructions: `You are an assistant that can add and manage comments on a rich text document.
In your responses, be concise and to the point. However, the content of the comments you generate does not need to be concise, it should follow the user's request as closely as possible.
Before calling any tools, summarize what you're going to do (in a sentence or less), as a high-level view of the task.
Rule: In your responses, do not give any details of the tool calls.
Rule: In your responses, do not give any details of the HTML content of the document.
Rule: In your responses, never mention the hashes of the document.

${schemaAwarenessPrompt}`,
    tools,
    providerOptions: {
      openai: {
        reasoningEffort: "minimal",
      },
    },
  });

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
  });
}
