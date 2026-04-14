import { devToolsMiddleware } from "@ai-sdk/devtools";
import { openai } from "@ai-sdk/openai";
import { Output, streamText, wrapLanguageModel } from "ai";
import z from "zod";
import { getIp, rateLimit } from "@/lib/rate-limit";
import { getSchemaAwarenessPrompt } from "@/lib/server-ai-toolkit/get-schema-awareness-prompt";
import {
  executeWorkflowEdit,
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
    task,
    sessionId,
  }: {
    documentId: string;
    schemaAwarenessData: unknown;
    task: string;
    sessionId?: string | null;
  } = await req.json();

  const readResult = await readWorkflowDocument({
    schemaAwarenessData,
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

  if (!readResult.output.success || !readResult.output.content) {
    throw new Error(readResult.output.error ?? "Failed to read document");
  }

  const [workflow, schemaAwarenessPrompt] = await Promise.all([
    getWorkflowDefinition("edit", "shorthand"),
    getSchemaAwarenessPrompt(schemaAwarenessData),
  ]);
  const model = wrapLanguageModel({
    model: openai("gpt-5.4-mini"),
    middleware:
      process.env.NODE_ENV === "production" ? [] : devToolsMiddleware(),
  });

  const result = streamText({
    model,
    system: `${workflow.systemPrompt}\n\n${schemaAwarenessPrompt}`,
    prompt: JSON.stringify({
      content: readResult.output.content,
      task,
    }),
    output: Output.object({ schema: z.fromJSONSchema(workflow.outputSchema) }),
    providerOptions: {
      openai: {
        reasoningEffort: "low",
      },
    },
  });
  const output = await result.output;

  const executeResult = await executeWorkflowEdit({
    schemaAwarenessData,
    format: "shorthand",
    input: output,
    sessionId: readResult.sessionId,
    reviewOptions: {
      mode: "disabled",
    },
    experimental_documentOptions: {
      documentId,
      userId: "ai-assistant",
    },
  });

  return Response.json({
    sessionId: executeResult.sessionId,
    operationResults: executeResult.output.operationResults ?? [],
  });
}
