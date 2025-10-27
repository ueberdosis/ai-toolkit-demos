import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
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

  const { html } = await req.json();

  const result = await generateObject({
    model: openai("gpt-5-mini"),
    prompt: `Fix all spelling and grammar errors in the HTML below. Return the complete corrected HTML with all errors fixed.

HTML to correct:
${html}`,
    schema: z.object({
      content: z.string().describe("The fully corrected HTML with all grammar and spelling errors fixed"),
    }),
  });

  return Response.json(result.object);
}
