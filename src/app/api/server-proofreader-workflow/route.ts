import { devToolsMiddleware } from "@ai-sdk/devtools";
import { openai } from "@ai-sdk/openai";
import { Output, streamText, wrapLanguageModel } from "ai";
import z from "zod";
import { getIp, rateLimit } from "@/lib/rate-limit";
import { getSchemaAwarenessPrompt } from "@/lib/server-ai-toolkit/get-schema-awareness-prompt";
import {
  executeWorkflowProofreader,
  getWorkflowDefinition,
  readWorkflowDocument,
} from "@/lib/server-ai-toolkit/workflow-api";

export async function POST(req: Request) {
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
    documentId,
    schemaAwarenessData,
    range,
    sessionId,
  }: {
    documentId: string;
    schemaAwarenessData: unknown;
    range: { from: number; to: number };
    sessionId?: string | null;
  } = await req.json();

  const readResult = await readWorkflowDocument({
    schemaAwarenessData,
    range,
    sessionId,
    format: "shorthand",
    reviewOptions: {
      mode: "disabled",
    },
    experimental_documentOptions: {
      documentId,
      userId: "ai-assistant",
    },
  });

  if (
    !readResult.output.success ||
    typeof readResult.output.content !== "string"
  ) {
    throw new Error(readResult.output.error ?? "Failed to read document");
  }

  const [workflow, schemaAwarenessPrompt] = await Promise.all([
    getWorkflowDefinition("proofreader", "shorthand"),
    getSchemaAwarenessPrompt(schemaAwarenessData),
  ]);
  const systemPrompt = `${workflow.systemPrompt}

You are reviewing a demo document that intentionally contains grammar and spelling mistakes.
If the content contains mistakes, do not return an empty operations array.
Return the concrete proofreader operations needed to correct the mistakes.

${schemaAwarenessPrompt}`;
  const prompt = JSON.stringify({
    content: readResult.output.content,
    task: "Correct all grammar and spelling mistakes",
  });
  const model = wrapLanguageModel({
    model: openai("gpt-5.4-mini"),
    middleware:
      process.env.NODE_ENV === "production" ? [] : devToolsMiddleware(),
  });

  const result = streamText({
    model,
    system: systemPrompt,
    prompt,
    output: Output.object({ schema: z.fromJSONSchema(workflow.outputSchema) }),
    providerOptions: {
      openai: {
        reasoningEffort: "low",
      },
    },
  });
  const output = (await result.output) as { operations?: unknown[] };

  const executeResult = await executeWorkflowProofreader({
    schemaAwarenessData,
    format: "shorthand",
    input: output,
    sessionId: readResult.sessionId,
    reviewOptions: {
      mode: "trackedChanges",
      trackedChangesOptions: {
        userId: "ai-assistant",
      },
    },
    experimental_documentOptions: {
      documentId,
      userId: "ai-assistant",
    },
  });

  return Response.json({
    sessionId: executeResult.sessionId,
    operationResults: executeResult.output.operationResults,
  });
}
