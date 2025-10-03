import { openai } from "@ai-sdk/openai";
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

  const {
    messages,
    schemaAwareness,
  }: { messages: UIMessage[]; schemaAwareness: string } = await req.json();

  const result = streamText({
    model: openai("gpt-5"),
    system: `You are an assistant that can edit rich text documents.

Rule: In your response to the user, do not include the HTML content of the tool calls you execute.

${schemaAwareness}`,
    messages: convertToModelMessages(messages),
    tools: toolDefinitions(),
    providerOptions: {
      openai: {
        reasoningEffort: "minimal",
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
