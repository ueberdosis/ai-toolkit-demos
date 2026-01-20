import { devToolsMiddleware } from "@ai-sdk/devtools";
import { openai } from "@ai-sdk/openai";
import { toolDefinitions } from "@tiptap-pro/ai-toolkit-ai-sdk";
import {
  createAgentUIStreamResponse,
  ToolLoopAgent,
  type UIMessage,
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

  const { messages }: { messages: UIMessage[] } = await req.json();

  const model = wrapLanguageModel({
    model: openai("gpt-5.1"),
    middleware:
      process.env.NODE_ENV === "production" ? [] : devToolsMiddleware(),
  });

  const agent = new ToolLoopAgent({
    model,
    instructions: `
You are an assistant that can edit rich text documents. 
In your responses, be concise and to the point. However, the content of the document you generate does not need to be concise and to the point, instead, it should follow the user's request as closely as possible.
Before calling any tools, summarize you're going to do (in a sentence or less), as a high-level view of the task, like a human writer would describe it.
Rule: In your responses, do not give any details of the tool calls
Rule: In your responses, do not give any details of the HTML content of the document.
`,
    tools: toolDefinitions(),
    // providerOptions: {
    //   openai: {
    //     reasoningEffort: "minimal",
    //   },
    // },
  });

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
  });
}
