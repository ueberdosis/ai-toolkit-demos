import { devToolsMiddleware } from "@ai-sdk/devtools";
import { openai } from "@ai-sdk/openai";
import {
  createAgentUIStreamResponse,
  ToolLoopAgent,
  tool,
  wrapLanguageModel,
} from "ai";
import z from "zod";
import { getIp, rateLimit } from "@/lib/rate-limit";
import { executeTool } from "@/lib/server-ai-toolkit/execute-tool";
import { getSchemaAwarenessPrompt } from "@/lib/server-ai-toolkit/get-schema-awareness-prompt";
import { getToolDefinitions } from "@/lib/server-ai-toolkit/get-tool-definitions";
import {
  getSessionIdFromConversationHistory,
  type ServerAiToolkitMessage,
} from "@/lib/server-ai-toolkit/session-id";

export async function POST(req: Request) {
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
    messages: ServerAiToolkitMessage[];
    schemaAwarenessData: unknown;
    documentId: string;
  } = await req.json();
  let sessionId = getSessionIdFromConversationHistory(messages);
  const toolDefinitions = await getToolDefinitions({
    schemaAwarenessData,
  });
  const schemaAwarenessPrompt =
    await getSchemaAwarenessPrompt(schemaAwarenessData);

  const tools = Object.fromEntries(
    toolDefinitions.map((toolDef) => [
      toolDef.name,
      tool({
        description: toolDef.description,
        inputSchema: z.fromJSONSchema(toolDef.inputSchema),
        execute: async (input) => {
          try {
            const result = await executeTool(
              toolDef.name,
              input,
              null,
              schemaAwarenessData,
              {
                documentId,
                sessionId,
                userId: "ai-assistant",
                reviewOptions: {
                  mode: "trackedChanges",
                },
              },
            );
            sessionId = result.sessionId;

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
    model: openai("gpt-5.4-mini"),
    middleware:
      process.env.NODE_ENV === "production" ? [] : devToolsMiddleware(),
  });

  const agent = new ToolLoopAgent({
    model,
    instructions: `You are an assistant that can edit rich text documents with tracked changes.
In your messages to the user, be concise and to the point. However, the content of the document you generate does not need to be concise and to the point, instead, it should follow the user's request as closely as possible.
Before calling any tools, summarize what you're going to do in one short sentence.
Rule: Use tiptapRead before tiptapEdit.
Rule: Keep user-facing responses to a single short sentence before tool calls and a single short sentence after completion.
Rule: In your messages to the user, do not give any details of the tool calls.
Rule: In your messages to the user, do not give any details of the document content or the individual edits.
Rule: In your messages to the user, never mention hashes, tool internals, or raw document JSON.

${schemaAwarenessPrompt}`,
    tools,
  });

  return createAgentUIStreamResponse({
    agent,
    messageMetadata: ({ part }) =>
      part.type === "finish" && sessionId ? { sessionId } : undefined,
    uiMessages: messages,
  });
}
