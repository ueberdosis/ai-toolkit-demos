import { devToolsMiddleware } from "@ai-sdk/devtools";
import { openai } from "@ai-sdk/openai";
import { generateObject, wrapLanguageModel } from "ai";
import z from "zod";
import { getIp, rateLimit } from "@/lib/rate-limit";
import {
  executeWorkflowThreads,
  getWorkflowDefinition,
  readWorkflowDocument,
  readWorkflowThreads,
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
  }: {
    documentId: string;
    schemaAwarenessData: unknown;
    task: string;
    range: { from: number; to: number };
  } = await req.json();

  const [documentReadResult, threadsReadResult] = await Promise.all([
    readWorkflowDocument({
      schemaAwarenessData,
      range,
      format: "shorthand",
      reviewOptions: {
        mode: "disabled",
      },
      experimental_documentOptions: {
        documentId,
        userId: "ai-assistant",
      },
    }),
    readWorkflowThreads({
      schemaAwarenessData,
      format: "shorthand",
      experimental_documentOptions: {
        documentId,
        userId: "ai-assistant",
      },
    }),
  ]);

  if (
    !documentReadResult.output.success ||
    !documentReadResult.output.content
  ) {
    throw new Error(
      documentReadResult.output.error ?? "Failed to read document content",
    );
  }

  if (threadsReadResult.hasError) {
    throw new Error(threadsReadResult.output.error ?? "Failed to read threads");
  }

  const workflow = await getWorkflowDefinition("threads", "shorthand");
  const model = wrapLanguageModel({
    model: openai("gpt-5.4-mini"),
    middleware:
      process.env.NODE_ENV === "production" ? [] : devToolsMiddleware(),
  });

  const result = await generateObject({
    model,
    system: workflow.systemPrompt,
    prompt: JSON.stringify({
      content: documentReadResult.output.content,
      threads: threadsReadResult.output.threads ?? [],
      task,
    }),
    schema: z.fromJSONSchema(workflow.outputSchema),
  });

  const executeResult = await executeWorkflowThreads({
    schemaAwarenessData,
    format: "shorthand",
    input: result.object,
    experimental_documentOptions: {
      documentId,
      userId: "ai-assistant",
    },
    experimental_commentsOptions: {
      threadData: { userName: "Tiptap AI" },
      commentData: { userName: "Tiptap AI" },
    },
  });

  return Response.json({
    operations: executeResult.output.operations ?? [],
    hasError: executeResult.hasError,
  });
}
