import { openai } from "@ai-sdk/openai";
import { toolDefinitions } from "@tiptap-pro/ai-toolkit-ai-sdk";
import {
  createAgentUIStreamResponse,
  ToolLoopAgent,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { getIp, rateLimit } from "@/lib/rate-limit";

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

  const { messages }: { messages: UIMessage[] } = await req.json();

  const agent = new ToolLoopAgent({
    model: openai("gpt-5-mini"),
    instructions: `You are an assistant that can edit rich text documents. 
    You have access multiple documents and can switch between them. 
    At any point in time, the 'active document' is the document that is open in the editor.
    When you call the tools to read and edit the document, they will read and edit the active document.
    To read and edit another document, you should use the tools to switch to that document and then read and edit it.
    Before making any edits, you should always list the documents and see which is the active document.

    In your responses, be concise and to the point. However, the content of the document you generate does not need to be concise and to the point, instead, it should follow the user's request as closely as possible.
    Before calling any tools, summarize you're going to do (in a sentence or less), as a high-level view of the task, like a human writer would describe it.
    Rule: In your responses, do not give any details of the tool calls.
    Rule: In your responses, do not give any details of the HTML content of the document.
    `,
    tools: {
      ...toolDefinitions(),
      createDocument: tool({
        description: "Create a new document",
        inputSchema: z.object({
          documentName: z.string(),
        }),
      }),
      listDocuments: tool({
        description:
          "See a list of all the documents you have access to, and see which is the active document",
        inputSchema: z.object({}),
      }),
      setActiveDocument: tool({
        description:
          "Switch to a specific document, so that it becomes the active document",
        inputSchema: z.object({
          documentName: z.string(),
        }),
      }),
      deleteDocument: tool({
        description: "Delete a document",
        inputSchema: z.object({
          documentName: z.string(),
        }),
      }),
    },
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
