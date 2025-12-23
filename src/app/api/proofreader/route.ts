import { openai } from "@ai-sdk/openai";
import { proofreaderWorkflow } from "@tiptap-pro/ai-toolkit-tool-definitions";
import { streamObject } from "ai";
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
  const { nodes } = await req.json();

  const workflow = proofreaderWorkflow();

  const result = streamObject({
    model: openai("gpt-5-mini"),
    // System prompt
    system: workflow.systemPrompt,
    // User message
    prompt: JSON.stringify({
      nodes,
      task: "Correct all grammar and spelling mistakes",
    }),
    schema: workflow.zodOutputSchema,
    providerOptions: {
      openai: {
        reasoningEffort: "minimal",
      },
    },
  });

  return result.toTextStreamResponse();
}
