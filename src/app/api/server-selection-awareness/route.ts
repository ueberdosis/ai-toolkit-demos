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
import { executeTool } from "@/lib/server-ai-toolkit/execute-tool";
import { getSchemaAwarenessPrompt } from "@/lib/server-ai-toolkit/get-schema-awareness-prompt";
import { getToolDefinitions } from "@/lib/server-ai-toolkit/get-tool-definitions";
import { readWorkflowSelection } from "@/lib/server-ai-toolkit/workflow-api";

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
    selectionRange,
  }: {
    messages: UIMessage[];
    schemaAwarenessData: unknown;
    documentId: string;
    selectionRange: { from: number; to: number };
  } = await req.json();

  const [toolDefinitions, schemaAwarenessPrompt, selectionResult] =
    await Promise.all([
      getToolDefinitions({
        schemaAwarenessData,
      }),
      getSchemaAwarenessPrompt(schemaAwarenessData),
      readWorkflowSelection({
        schemaAwarenessData,
        format: "shorthand",
        range: selectionRange,
        reviewOptions: {
          mode: "disabled",
        },
        experimental_documentOptions: {
          documentId,
          userId: "ai-assistant",
        },
      }),
    ]);

  const selectionPrompt = selectionResult.output.success
    ? `${selectionResult.output.prompt ?? "The current selection is the active edit target."}
Only edit the currently selected content or its containing selected nodes.
Do not change content outside the current selection context unless the user explicitly asks for it and it is required to complete the selected edit.`
    : "The current selection could not be read. Ask the user to reselect the content and try again.";

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
    model: openai("gpt-5.4-mini"),
    middleware:
      process.env.NODE_ENV === "production" ? [] : devToolsMiddleware(),
  });

  const agent = new ToolLoopAgent({
    model,
    instructions: `You are an assistant that can edit rich text documents.
In your responses, be concise and to the point. However, the content of the document you generate does not need to be concise and to the point, instead, it should follow the user's request as closely as possible.
Before calling any tools, summarize what you're going to do in one short sentence.
Rule: In your responses, do not give any details of the tool calls.
Rule: In your responses, do not give any details of the HTML content of the document.
Rule: In your responses, never mention the hashes of the document.
Rule: Treat the current selection as the primary editing scope.
Rule: Use tiptapRead before tiptapEdit when you need more document context.

<selection-context>
${selectionPrompt}
</selection-context>

${schemaAwarenessPrompt}`,
    tools,
  });

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
  });
}
