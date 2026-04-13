import { devToolsMiddleware } from "@ai-sdk/devtools";
import { openai } from "@ai-sdk/openai";
import { Output, streamText, wrapLanguageModel } from "ai";
import z from "zod";
import { getIp, rateLimit } from "@/lib/rate-limit";
import { getSchemaAwarenessPrompt } from "@/lib/server-ai-toolkit/get-schema-awareness-prompt";
import {
  executeWorkflowInsertContent,
  getWorkflowDefinition,
  readWorkflowSelection,
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

  const readResult = await readWorkflowSelection({
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

  if (readResult.output.isEmpty) {
    throw new Error("No selection available for insert-content workflow");
  }

  const [workflow, schemaAwarenessPrompt] = await Promise.all([
    getWorkflowDefinition("insert-content", "shorthand"),
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
      task,
      replace: readResult.output.content,
      context: readResult.output.prompt,
    }),
    output: Output.object({ schema: z.fromJSONSchema(workflow.outputSchema) }),
    providerOptions: {
      openai: {
        reasoningEffort: "low",
      },
    },
  });
  const workflowOutput = (await result.output) as { content: string };

  const executeResult = await executeWorkflowInsertContent({
    schemaAwarenessData,
    format: "shorthand",
    input: workflowOutput.content,
    range,
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
    range: executeResult.output.range ?? null,
  });
}
