import { anthropic } from "@ai-sdk/anthropic";
import { devToolsMiddleware } from "@ai-sdk/devtools";
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
    model: anthropic("claude-haiku-4-5"),
    middleware: devToolsMiddleware(),
  });

  const agent = new ToolLoopAgent({
    model,
    instructions: `
You are an assistant that can add comments to a rich text document. 
In your responses, be concise and to the point. However, the content of the comments you generate does not need to be concise and to the point, instead, it should follow the user's request as closely as possible.
Rule: In your responses, do not give any details of the tool calls.
Rule: In your responses, do not give any details of the HTML content of the document. Just briefly explain what you're going to do (in a sentence or less).
`,
    tools: toolDefinitions({
      tools: {
        editThreads: true,
        getThreads: true,
        tiptapEdit: false,
        tiptapReadSelection: false,
      },
    }),
  });

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
  });
}
