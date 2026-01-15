import { devToolsMiddleware } from "@ai-sdk/devtools";
import { openai } from "@ai-sdk/openai";
import { createTiptapEditWorkflow } from "@tiptap-pro/ai-toolkit-tool-definitions";
import { Output, streamText, wrapLanguageModel } from "ai";
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
  const { nodes, task } = await req.json();

  // Create and configure the Tiptap Edit workflow (with the default settings).
  // It includes the ready-to-use system prompt and the output schema.
  const workflow = createTiptapEditWorkflow();

  const model = wrapLanguageModel({
    model: openai("gpt-5-mini"),
    middleware: devToolsMiddleware(),
  });

  const result = streamText({
    model,
    // System prompt
    system: workflow.systemPrompt,
    // User message
    prompt: JSON.stringify({
      nodes,
      task,
    }),
    output: Output.object({ schema: workflow.zodOutputSchema }),
    // If you use gpt-5-mini, set the reasoning effort to minimal to improve the
    // response time.
    providerOptions: {
      openai: {
        reasoningEffort: "minimal",
      },
    },
  });

  return result.toTextStreamResponse();
}
