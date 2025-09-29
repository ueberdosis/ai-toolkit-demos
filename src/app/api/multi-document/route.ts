import { openai } from "@ai-sdk/openai";
import { toolDefinitions } from "@tiptap-pro/ai-toolkit-ai-sdk";
import { convertToModelMessages, streamText, tool, UIMessage } from "ai";
import { rateLimit, getIp } from "@/lib/rate-limit";
import { z } from "zod";

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

  const result = streamText({
    model: openai("gpt-5"),
    system: `You are an assistant that can edit rich text documents. 
    You have access multiple documents and can switch between them. 
    At any point in time, the 'active document' is the document that is open in the editor.
    When you call the tools to read and edit the document, they will read and edit the active document.
    To read and edit another document, you should use the tools to switch to that document and then read and edit it.
    Before making any edits, you should always list the documents and see which is the active document.
    `,
    messages: convertToModelMessages(messages),
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
        description: "Switch to a specific document, so that it becomes the active document",
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

  return result.toUIMessageStreamResponse();
}
