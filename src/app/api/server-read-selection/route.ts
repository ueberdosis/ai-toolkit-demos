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
import { executeTool } from "@/lib/server-ai-toolkit/execute-tool";
import { getTools } from "@/lib/server-ai-toolkit/get-tools";

export async function POST(req: Request) {
  const {
    messages,
    editorContext,
    documentId,
    selectionUserId,
  }: {
    messages: UIMessage[];
    editorContext: unknown;
    documentId: string;
    selectionUserId: string;
  } = await req.json();

  const toolsResponse = await getTools({
    editorContext,
    tools: { tiptapRead: true, tiptapEdit: true, readSelection: true },
  });

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
                // readSelection reads a specific collaborator's live selection;
                // the human's awareness id is developer config, not model input.
                toolConfig:
                  toolDef.name === "readSelection"
                    ? { user: selectionUserId }
                    : {},
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
    model: gateway("openai/gpt-5.6-luna"),
    middleware:
      process.env.NODE_ENV === "production" ? [] : devToolsMiddleware(),
  });

  const agent = new ToolLoopAgent({
    model,
    instructions: `You are an assistant that can edit rich text documents.
In your responses, be concise and to the point. However, the content of the document you generate does not need to be concise and to the point, instead, it should follow the user's request as closely as possible.
Before calling any tools, summarize you're going to do (in a sentence or less), as a high-level view of the task, like a human writer would describe it.
Rule: In your responses, do not give any details of the tool calls.
Rule: In your responses, do not give any details of the Tiptap JSON content of the document.
Rule: In your responses, never mention the hashes of the document.

${toolsResponse.systemPrompt}`,
    tools,
  });

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
  });
}
