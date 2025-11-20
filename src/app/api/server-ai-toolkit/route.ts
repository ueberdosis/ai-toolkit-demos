import { anthropic } from "@ai-sdk/anthropic";

// import { openai } from "@ai-sdk/openai";
import {
  getServerAiToolkit,
  TiptapCloudStorage,
} from "@tiptap-pro/ai-toolkit";
import { serverToolDefinitions } from "@tiptap-pro/ai-toolkit-ai-sdk";
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
    schemaAwarenessData,
  }: { messages: UIMessage[]; schemaAwarenessData: any } = await req.json();

  const serverAiToolkit = getServerAiToolkit({
    schemaAwarenessData,
    tools: serverToolDefinitions(),
    storage: new TiptapCloudStorage({
      documentIdentifier: "tiptap-server-ai-toolkit-1",
      appId: process.env.TIPTAP_CLOUD_APP_ID!,
      apiSecret: process.env.REST_API_SECRET!,
    }),
  });

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    // model: openai("gpt-5.1"),
    system: `
You are an assistant that can edit rich text documents. 
<rules>
In your responses, be concise and to the point. However, the content of the document you generate does not need to be concise and to the point, instead, it should follow the user's request as closely as possible.
Before every action you take, you should briefly explain what you're going to do in one sentence, without giving any details of the tool calls or the JSON content of the document.
Under no circumstances should you give any details of the tool calls or the JSON content of the document. Just give a high-level overview of what you're going to do, as if you were a writer.
After you finish your work, give a small summary of what you did in one sentence.
</rules>

${serverAiToolkit.getTools()}
`,
    messages: convertToModelMessages(messages),
    tools: serverAiToolkit.getTools(),
  });

  return result.toUIMessageStreamResponse();
}
