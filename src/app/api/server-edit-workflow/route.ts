import { devToolsMiddleware } from "@ai-sdk/devtools";
import { openai } from "@ai-sdk/openai";
import { generateObject, wrapLanguageModel } from "ai";
import z from "zod";
import { getIp, rateLimit } from "@/lib/rate-limit";
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
    range,
    sessionId,
  }: {
    documentId: string;
    schemaAwarenessData: unknown;
    task: string;
    range: { from: number; to: number };
    sessionId?: string | null;
  } = await req.json();

  const readResult = await readWorkflowDocument({
    schemaAwarenessData,
    range,
    sessionId,
    format: "json",
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

  const workflow = await getWorkflowDefinition("edit", "json");
  const model = wrapLanguageModel({
    model: openai("gpt-5.4-mini"),
    middleware:
      process.env.NODE_ENV === "production" ? [] : devToolsMiddleware(),
  });

  const result = await generateObject({
    model,
    system: workflow.systemPrompt,
    prompt: JSON.stringify({
      content: readResult.output.content,
      task,
    }),
    schema: z.fromJSONSchema(workflow.outputSchema),
    providerOptions: {
      openai: {
        reasoningEffort: "low",
      },
    },
  });

  const executeResult = await executeWorkflowEdit({
    schemaAwarenessData,
    format: "json",
    input: result.object,
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
