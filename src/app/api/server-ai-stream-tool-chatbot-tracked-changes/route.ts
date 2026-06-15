import { devToolsMiddleware } from "@ai-sdk/devtools";
import { gateway, streamText, tool, wrapLanguageModel } from "ai";
import z from "zod";
import { getIp, rateLimit } from "@/lib/rate-limit";
import { getTiptapCloudAiJwtToken } from "@/lib/server-ai-toolkit/get-tiptap-cloud-ai-jwt-token";

// Duplex request-body streaming requires the Node.js runtime (not Edge). Raise the
// function timeout so a long, paced AI edit isn't cut off by the platform default.
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Tracked-changes variant of the LLM-driven `/stream-tool` bridge.
 *
 * Identical to `server-ai-stream-tool-chatbot` except the `start` message
 * carries `reviewOptions: { mode: "trackedChanges" }`, so the AI server
 * applies the streamed edit as a tracked-change suggestion (old content kept
 * red, new content typed into the green area, sharing one suggestion id)
 * instead of mutating the document in place. The editor renders the
 * suggestion live via Y.Doc sync and can accept/reject it.
 *
 *   browser → this route → POST /v3/toolkit/tools                       (prompt + tool defs)
 *                       → POST /v3/toolkit/execute-tool                 (readDocument tool — fetches via WS session)
 *                       → LLM via streamText({tools:{tiptapEdit:tool(...)}})
 *                          - tool.onInputDelta → /stream-tool `delta` msg
 *                       → AI server's NDJSON response → browser
 */
export async function POST(req: Request) {
  if (process.env.UPSTASH_REDIS_REST_URL) {
    const ip = await getIp();
    const isAllowed = await rateLimit(ip);
    if (!isAllowed) {
      return new Response("Rate limit exceeded. Please try again later.", {
        status: 429,
        headers: { "Content-Type": "text/plain" },
      });
    }
  }

  const {
    task,
    schemaAwarenessData,
    documentId,
    userId,
  }: {
    task: string;
    schemaAwarenessData: unknown;
    documentId: string;
    userId?: string;
  } = await req.json();

  if (!task || !schemaAwarenessData || !documentId) {
    return new Response(
      JSON.stringify({
        error: "Missing required fields: task, schemaAwarenessData, documentId",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const apiBaseUrl =
    process.env.TIPTAP_CLOUD_AI_API_URL || "https://api.tiptap.dev/v3/ai";
  const appId = process.env.TIPTAP_CLOUD_AI_APP_ID;
  if (!appId) {
    return new Response(
      JSON.stringify({
        error: "Server misconfigured: TIPTAP_CLOUD_AI_APP_ID",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // 1) Single canonical call: `/tools` returns both the schema-awareness
  //    prompt and the tool definitions in one round-trip. `format: "json"`
  //    is required because `/stream-tool`'s processor parses content as an
  //    array of ProseMirror JSON nodes — shorthand strings wouldn't stream
  //    into individual createNode/appendText actions.
  type ToolsResponse = {
    tools: Array<{
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
    }>;
    prompt: string;
  };
  let toolsResponse: ToolsResponse;
  try {
    const fetchResult = await fetch(`${apiBaseUrl}/toolkit/tools`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getTiptapCloudAiJwtToken()}`,
        "X-App-Id": appId,
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        editorContext: schemaAwarenessData,
        tools: { tiptapEdit: true },
        format: "json",
      }),
    });
    if (!fetchResult.ok) {
      throw new Error(`${fetchResult.status} ${fetchResult.statusText}`);
    }
    toolsResponse = (await fetchResult.json()) as ToolsResponse;
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: `Failed to fetch tools: ${
          err instanceof Error ? err.message : String(err)
        }`,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  const tiptapEditTool = toolsResponse.tools.find(
    (t) => t.name === "tiptapEdit",
  );
  if (!tiptapEditTool) {
    return new Response(
      JSON.stringify({
        error: "Server /tools response did not include the tiptapEdit tool",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  // 2) Read the document via the `readDocument` tool through /execute-tool.
  //    This goes through the session-backed DocumentProvider, which opens a
  //    WebSocket session against Tiptap Cloud Hocuspocus — bypassing the
  //    Document API REST surface that requires a wider JWT scope than the
  //    customer's multi-aud token typically carries.
  let documentContent: unknown;
  try {
    const readResult = await fetch(`${apiBaseUrl}/toolkit/execute-tool`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getTiptapCloudAiJwtToken()}`,
        "X-App-Id": appId,
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        toolName: "readDocument",
        input: {},
        editorContext: schemaAwarenessData,
        experimental_documentOptions: {
          documentId,
          userId: userId ?? "ai-assistant",
        },
        format: "json",
      }),
    });
    if (!readResult.ok) {
      const errorText = await readResult.text();
      throw new Error(
        `${readResult.status} ${readResult.statusText}${errorText ? ` - ${errorText}` : ""}`,
      );
    }
    const readJson = (await readResult.json()) as {
      toolResult?: { success?: boolean; content?: unknown; error?: string };
    };
    if (!readJson.toolResult?.success || !readJson.toolResult.content) {
      throw new Error(
        readJson.toolResult?.error ?? "readDocument tool returned no content",
      );
    }
    documentContent = readJson.toolResult.content;
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: `readDocument tool failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  // 3) Build the NDJSON request body driven by the tool's onInput* callbacks.
  const encoder = new TextEncoder();
  // Ref so TS doesn't narrow the controller binding to `null` through
  // the closure assignment in `start()`.
  const controllerRef: {
    current: ReadableStreamDefaultController<Uint8Array> | null;
  } = { current: null };
  const ndjsonRequestBody = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef.current = controller;
    },
  });
  let forwardedStart = false;
  let forwardedEnd = false;

  const writeNdjson = (payload: Record<string, unknown>) => {
    if (!controllerRef.current) return;
    controllerRef.current.enqueue(
      encoder.encode(`${JSON.stringify(payload)}\n`),
    );
  };

  const upstreamPromise = fetch(`${apiBaseUrl}/toolkit/stream-tool`, {
    method: "POST",
    // @ts-expect-error - undici requires `duplex: "half"` for streaming
    // request bodies; the Web Fetch types don't include it yet.
    duplex: "half",
    headers: {
      "Content-Type": "application/x-ndjson",
      Authorization: `Bearer ${getTiptapCloudAiJwtToken()}`,
      "X-App-Id": appId,
      Origin: "http://localhost:3000",
    },
    body: ndjsonRequestBody,
  });

  // 4) LLM call. The tool uses `tiptapEdit`'s canonical inputSchema (now
  //    strict — `content` items cannot carry operation keywords as their
  //    `type`, see ai-server `createTiptapEditSchema`). The `onInputDelta`
  //    callback yields raw text deltas as the model generates them —
  //    which is what `/stream-tool` expects.
  const model = wrapLanguageModel({
    model: gateway("openai/gpt-5.4-mini"),
    middleware:
      process.env.NODE_ENV === "production" ? [] : devToolsMiddleware(),
  });

  const llmResult = streamText({
    model,
    system: `You are an expert editor that can edit rich text documents using the tiptapEdit tool. You will be given a document and a task; return one or more edit operations that complete the task.\n\n${toolsResponse.prompt}`,
    prompt: JSON.stringify({ content: documentContent, task }),
    tools: {
      tiptapEdit: tool({
        description: tiptapEditTool.description,
        inputSchema: z.fromJSONSchema(
          tiptapEditTool.inputSchema as z.core.JSONSchema.JSONSchema,
        ),
        // Force OpenAI structured-outputs constrained sampling so the
        // `inputSchema` enum on `content[].type` is enforced at token level
        // (not just sent as a hint). Without this flag, the LLM has been
        // observed bypassing the enum and nesting operations into content.
        // See `@ai-sdk/openai`'s `prepareChatTools` — `strict` is only
        // forwarded when explicitly set; OpenAI defaults to false otherwise.
        strict: true,
        onInputStart: () => {
          if (forwardedStart) return;
          forwardedStart = true;
          writeNdjson({
            version: 1,
            type: "start",
            toolName: "tiptapEdit",
            editorContext: schemaAwarenessData,
            experimental_documentOptions: {
              documentId,
              userId: userId ?? "ai-assistant",
            },
            // Tracked-changes mode: the AI server keeps the old content as a
            // red `replaceDeletion` and types the new content into a green
            // `replaceInsertion`, sharing one suggestion id. The suggestion
            // author is `trackedChangesOptions.userId`.
            reviewOptions: {
              mode: "trackedChanges",
              trackedChangesOptions: {
                userId: userId ?? "ai-assistant",
                userMetadata: { name: "AI" },
              },
            },
          });
        },
        onInputDelta: ({ inputTextDelta }) => {
          if (!forwardedStart || forwardedEnd) return;
          if (!inputTextDelta) return;
          writeNdjson({
            version: 1,
            type: "delta",
            argsTextDelta: inputTextDelta,
          });
        },
        onInputAvailable: () => {
          if (forwardedEnd) return;
          forwardedEnd = true;
          writeNdjson({ version: 1, type: "end" });
          controllerRef.current?.close();
          controllerRef.current = null;
        },
      }),
    },
    toolChoice: "required",
    providerOptions: {
      openai: { reasoningEffort: "low" },
    },
  });

  // 5) Drain the LLM stream in the background so the callbacks fire.
  void (async () => {
    try {
      for await (const _event of llmResult.fullStream) {
        // No-op — callbacks above do the work.
      }
    } catch (err) {
      console.error(
        "[stream-tool-chatbot-tracked-changes] LLM stream error",
        err,
      );
    } finally {
      if (!forwardedEnd) {
        controllerRef.current?.close();
        controllerRef.current = null;
      }
    }
  })();

  const upstream = await upstreamPromise;
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-transform",
    },
  });
}
