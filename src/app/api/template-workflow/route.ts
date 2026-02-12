import { devToolsMiddleware } from "@ai-sdk/devtools";
import { openai } from "@ai-sdk/openai";
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
    model: openai("gpt-5-mini"),
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
    // If you use gpt-5-mini, set the reasoning effort to minimal to improve the
    // response time.
    providerOptions: {
      openai: {
        reasoningEffort: "minimal",
      },
    },
  });

  return Response.json(result.output);
}
