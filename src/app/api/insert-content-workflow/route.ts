import { devToolsMiddleware } from "@ai-sdk/devtools";
import { createInsertContentWorkflow } from "@tiptap-pro/client-ai-toolkit-tool-definitions";
import {
  createTextStreamResponse,
  gateway,
  streamText,
  toTextStream,
  wrapLanguageModel,
} from "ai";
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

  const { task, replace } = await req.json();

  // Create and configure the insert content workflow (with the default settings).
  // It includes the ready-to-use system prompt.
  const workflow = createInsertContentWorkflow();

  const model = wrapLanguageModel({
    model: gateway("openai/gpt-5.6-luna"),
    middleware:
      process.env.NODE_ENV === "production" ? [] : devToolsMiddleware(),
  });

  const result = streamText({
    model,
    // System prompt
    instructions: workflow.systemPrompt,
    // User message with the task and content in a JSON object
    prompt: JSON.stringify({
      task,
      replace,
    }),
    providerOptions: {
      openai: {
        reasoningEffort: "low",
      },
    },
  });

  // Return the text stream directly
  return createTextStreamResponse({
    stream: toTextStream({ stream: result.stream }),
  });
}
