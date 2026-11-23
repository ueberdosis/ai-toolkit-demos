import { getIp, rateLimit } from "@/lib/rate-limit";
import { executeTool } from "@/lib/server-ai-toolkit/execute-tool";

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
    editorContext,
    documentId,
    onInvalidContent,
  }: {
    editorContext: unknown;
    documentId: string;
    onInvalidContent: "remove" | "error";
  } = await req.json();

  // A read-only request: tiptapRead never edits the document content.
  try {
    const result = await executeTool(
      "tiptapRead",
      { from: 0 },
      null,
      editorContext,
      { documentId, userId: "ai-assistant", onInvalidContent },
    );

    return Response.json({ ok: true, docChanged: result.docChanged });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
