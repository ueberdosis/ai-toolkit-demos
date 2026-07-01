import { devToolsMiddleware } from "@ai-sdk/devtools";
import {
  createAgentUIStreamResponse,
  gateway,
  ToolLoopAgent,
  tool,
  type UIMessage,
  wrapLanguageModel,
} from "ai";
import z from "zod";
import { getIp, rateLimit } from "@/lib/rate-limit";
import { executeTool } from "@/lib/server-ai-toolkit/execute-tool";
import { getTools } from "@/lib/server-ai-toolkit/get-tools";

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
    editorContext,
    documentId,
  }: {
    messages: UIMessage[];
    editorContext: unknown;
    documentId: string;
  } = await req.json();

  // Get tool definitions from the Server AI Toolkit API
  const toolsResponse = await getTools({
    editorContext,
  });

  // Convert API tool definitions to AI SDK tool format
  const tools = Object.fromEntries(
    toolsResponse.tools.map((toolDef) => [
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
              editorContext,
              {
                documentId,
                userId: "ai-assistant",
              },
            );

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
    model: gateway("openai/gpt-5.4-mini"),
    middleware:
      process.env.NODE_ENV === "production" ? [] : devToolsMiddleware(),
  });

  const agent = new ToolLoopAgent({
    model,
    instructions: `You are an assistant that can edit rich text documents.
In your responses, be concise and to the point. However, the content of the document you generate does not need to be concise and to the point, instead, it should follow the user's request as closely as possible.
Before calling any tools, summarize you're going to do (in a sentence or less), as a high-level view of the task, like a human writer would describe it.
Rule: In your responses, do not give any details of the tool calls
Rule: In your responses, do not give any details of the HTML content of the document.
Rule: In your responses, never mention the hashes of the document.

${toolsResponse.systemPrompt}`,
    tools,
  });

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
  });
}
