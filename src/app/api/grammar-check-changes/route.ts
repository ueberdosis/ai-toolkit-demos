import { openai } from "@ai-sdk/openai";
import { streamObject } from "ai";
import { z } from "zod";
import { getIp, rateLimit } from "@/lib/rate-limit";

// Prevent abuse by limiting input size (100KB limit)
const MAX_HTML_LENGTH = 100 * 1024; // 100KB

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

  // Parse and validate request body
  let body: { html?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON in request body", {
      status: 400,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  const { html } = body;

  // Validate html parameter exists and is a string
  if (!html || typeof html !== "string") {
    return new Response(
      "Missing or invalid 'html' parameter. Expected a non-empty string.",
      {
        status: 400,
        headers: {
          "Content-Type": "text/plain",
        },
      },
    );
  }

  if (html.length > MAX_HTML_LENGTH) {
    return new Response(
      `HTML content too large. Maximum allowed size is ${MAX_HTML_LENGTH} characters.`,
      {
        status: 413,
        headers: {
          "Content-Type": "text/plain",
        },
      },
    );
  }

  const result = streamObject({
    model: openai("gpt-4o-mini"),
    prompt: `Fix all spelling and grammar errors in the HTML below. Return a list of specific changes that need to be made.

For each error found:
- Provide ONLY the exact text that needs to be changed, not the entire sentence
- Example: If "I didn't knew" needs to become "I didn't know", only provide delete: "knew" and insert: "know"
- Both "insert" and "delete" fields MUST contain non-empty text
- Each change should be minimal and specific

HTML to correct:
${html}`,
    schema: z.object({
      changes: z.array(
        z.object({
          insert: z.string().describe("The corrected text to insert"),
          delete: z.string().describe("The incorrect text to delete"),
        }),
      ),
    }),
  });

  return result.toTextStreamResponse();
}
