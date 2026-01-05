import { anthropic } from "@ai-sdk/anthropic";
import { toolDefinitions } from "@tiptap-pro/ai-toolkit-ai-sdk";
import { createAgentUIStreamResponse, ToolLoopAgent, type UIMessage } from "ai";
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

  const {
    messages,
    schemaAwareness,
  }: { messages: UIMessage[]; schemaAwareness: string } = await req.json();

  const agent = new ToolLoopAgent({
    model: anthropic("claude-haiku-4-5-20251001"),
    instructions: `
You are an assistant that can edit rich text documents. 
In your responses, be concise and to the point. However, the content of the document you generate does not need to be concise and to the point, instead, it should follow the user's request as closely as possible.
Rule: In your responses, do not give any details of the tool calls.
Rule: In your responses, do not give any details of the HTML content of the document. Just briefly explain what you're going to do (in a sentence or less).

${schemaAwareness}`,
    tools: toolDefinitions(),
  });

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
  });
}
