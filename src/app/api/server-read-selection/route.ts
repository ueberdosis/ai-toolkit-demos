import {
  createAgentUIStreamResponse,
  gateway,
  ToolLoopAgent,
  tool,
  type UIMessage,
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
    selectionUserId?: string;
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
                ...(toolDef.name === "readSelection" && selectionUserId
                  ? { toolConfig: { user: selectionUserId } }
                  : {}),
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
    model: gateway("openai/gpt-5.4-mini"),
    instructions: `You are an assistant that edits the user's selected text in a rich text document.

When the user refers to "my selection" or "the selected text", first call the readSelection tool to see exactly what they selected. The selected span is marked with selectionStart and selectionEnd. Then call tiptapRead for context and tiptapEdit to apply the change to ONLY the selected content, leaving the unselected text unchanged. If the selection is empty, tell the user to select some text first.

Be concise in your responses. Do not mention tool calls, HTML, or document hashes.

${toolsResponse.systemPrompt}`,
    tools,
  });

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
  });
}
