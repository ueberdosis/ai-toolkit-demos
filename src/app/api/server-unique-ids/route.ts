import {
  createAgentUIStreamResponse,
  ToolLoopAgent,
  tool,
  type UIMessage,
} from "ai";
import z from "zod";
import { getModel } from "@/lib/get-model";
import { getIp, rateLimit } from "@/lib/rate-limit";
import { executeTool } from "@/lib/server-ai-toolkit/execute-tool";
import { getTools } from "@/lib/server-ai-toolkit/get-tools";
import {
  type ReviewMode,
  type ToolSet,
  uniqueIdOptions,
} from "../../server-unique-ids/unique-id-options";

const toolsBySet: Record<ToolSet, Record<string, boolean>> = {
  tiptapEdit: { tiptapRead: true, tiptapEdit: true },
  tiptapQuery: { tiptapQuery: true },
  replaceDocument: { tiptapRead: true, replaceDocument: true },
};

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
    toolSet,
    reviewMode,
  }: {
    messages: UIMessage[];
    editorContext: unknown;
    documentId: string;
    toolSet: ToolSet;
    reviewMode: ReviewMode;
  } = await req.json();

  // Every request passes the same settings as the editor's Unique ID extension.
  const toolsResponse = await getTools({
    editorContext,
    tools: toolsBySet[toolSet],
    uniqueId: uniqueIdOptions,
  });

  const tools = Object.fromEntries(
    toolsResponse.tools.map((toolDef) => [
      toolDef.name,
      tool({
        description: toolDef.description,
        inputSchema: z.fromJSONSchema(toolDef.inputSchema),
        strict: false,
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
                reviewOptions: { mode: reviewMode },
                uniqueId: uniqueIdOptions,
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

  const agent = new ToolLoopAgent({
    model: getModel(),
    providerOptions: { openai: { parallelToolCalls: false } },
    instructions: `You are an assistant that can edit rich text documents.
In your responses, be concise and to the point.
Before calling any tools, summarize what you're going to do in one short sentence.
Rule: In your responses, do not give any details of the tool calls, the Tiptap JSON content or the hashes of the document.
Rule: The editor keeps an empty paragraph at the end of the document. Ignore it: don't write into it, and add new content after the last non-empty node.

${toolsResponse.systemPrompt}`,
    tools,
  });

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
  });
}
