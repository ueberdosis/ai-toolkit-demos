import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
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

  const { userRequest, selection } = await req.json();

  const result = streamText({
    model: openai("gpt-5-mini"),
    system:
      "You are an expert writer that can edit rich text documents. The user has selected part of the document. You will receive the current content of the selection (in HTML format) and the user's request. Re-write the content of the selection to meet the user's request. Generate the HTML code for the new content of the selection. If the user's request is not clear or does not relate to editing the document, generate HTML code where you ask the user to clarify the request. Your response should only contain the HTML code, no other text or explanation, no Markdown, and your HTML response should not be wrapped in backticks, Markdown code blocks, or other extra formatting.",
    prompt: `User request:
"""
${userRequest}
"""
Selection:
"""
${selection}
"""`,
    providerOptions: {
      openai: {
        reasoningEffort: "minimal",
      },
    },
  });

  // Return the text stream directly
  return result.toTextStreamResponse();
}
