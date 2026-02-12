import { devToolsMiddleware } from "@ai-sdk/devtools";
import { anthropic } from "@ai-sdk/anthropic";
import { createTemplateWorkflow } from "@tiptap-pro/ai-toolkit-tool-definitions";
import { generateText, Output, wrapLanguageModel } from "ai";
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

  const { htmlTemplate, task } = await req.json();

  // Create and configure the template workflow.
  // It auto-extracts template keys from the HTML and generates the prompt and schema.
  const workflow = createTemplateWorkflow({ htmlTemplate });

  const model = wrapLanguageModel({
    model: anthropic("claude-haiku-4-5-20251001"),
    middleware:
      process.env.NODE_ENV === "production" ? [] : devToolsMiddleware(),
  });

  const result = await generateText({
    model,
    // System prompt
    system: workflow.systemPrompt,
    // User message
    prompt: JSON.stringify({ task }),
    output: Output.object({ schema: workflow.zodOutputSchema }),
  });

  return Response.json(result.output);
}
