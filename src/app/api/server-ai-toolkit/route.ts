// import { anthropic } from "@ai-sdk/anthropic";

import { openai } from "@ai-sdk/openai";
import { serverToolDefinitions } from "@tiptap-pro/ai-toolkit-ai-sdk";
import {
  getServerAiToolkit,
  type SchemaAwarenessData,
  TiptapCloudStorage,
} from "@tiptap-pro/server-ai-toolkit";
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
    schemaAwarenessData,
  }: { messages: UIMessage[]; schemaAwarenessData: SchemaAwarenessData } =
    await req.json();

  const serverAiToolkit = getServerAiToolkit({
    schemaAwarenessData,
    tools: serverToolDefinitions(),
    storage: new TiptapCloudStorage({
      documentIdentifier: "tiptap-server-ai-toolkit-1",
      appId: process.env.TIPTAP_CLOUD_APP_ID,
      apiSecret: process.env.REST_API_SECRET,
    }),
  });

  const agent = new ToolLoopAgent({
    // model: anthropic("claude-haiku-4-5-20251001"),
    model: openai("gpt-5-mini"),
    // Allow the model to call tools up to 10 times
    instructions: `
You are an assistant that can edit rich text documents. 
In your responses, be concise and to the point. However, the content of the document you generate does not need to be concise and to the point, instead, it should follow the user's request as closely as possible.
Before calling any tools, summarize you're going to do (in a sentence or less), as a high-level view of the task, like a human writer would describe it.
Rule: In your responses, do not give any details of the tool calls
Rule: In your responses, do not give any details of the HTML content of the document.

${serverAiToolkit.getSchemaAwarenessPrompt()}
`,
    tools: serverAiToolkit.getTools(),
    providerOptions: {
      openai: {
        reasoningEffort: "minimal",
      },
    },
  });

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
  });
}
