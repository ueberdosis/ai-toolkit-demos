import { anthropic } from "@ai-sdk/anthropic";
import { toolDefinitions } from "@tiptap-pro/ai-toolkit-ai-sdk";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
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

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system:
      "You are an assistant that can add comments to a document. In your responses, be concise and to the point. Describe, in a sentence, a high-level overview of what you're going to do but do not include specific details like the tool name, the html content of the document, etc. Your response should be no more than 1-2 sentences.",
    messages: convertToModelMessages(messages),
    tools: toolDefinitions({
      tools: {
        editThreads: true,
        getThreads: true,
        applyPatch: false,
        insertContent: false,
        readSelection: false,
      },
    }),
    providerOptions: {
      openai: {
        reasoningEffort: "minimal",
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
