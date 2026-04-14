import { devToolsMiddleware } from "@ai-sdk/devtools";
import { openai } from "@ai-sdk/openai";
import { Output, streamText, wrapLanguageModel } from "ai";
import z from "zod";
import { getIp, rateLimit } from "@/lib/rate-limit";
import { getSchemaAwarenessPrompt } from "@/lib/server-ai-toolkit/get-schema-awareness-prompt";
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
  }: {
    documentId: string;
    schemaAwarenessData: unknown;
    task: string;
  } = await req.json();

  const [documentReadResult, threadsReadResult] = await Promise.all([
    readWorkflowDocument({
      schemaAwarenessData,
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

  if (threadsReadResult.output.error) {
    throw new Error(threadsReadResult.output.error ?? "Failed to read threads");
  }

  const [workflow, schemaAwarenessPrompt] = await Promise.all([
    getWorkflowDefinition("threads", "shorthand"),
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
      content: documentReadResult.output.content,
      threads: threadsReadResult.output.threads ?? [],
      task,
    }),
    output: Output.object({ schema: z.fromJSONSchema(workflow.outputSchema) }),
  });
  const output = (await result.output) as {
    operations?: Array<{
      type: string;
      nodeHash?: string | null;
      threadId?: string | null;
      commentId?: string | null;
      content?: string | null;
    }>;
  };

  const executeResult = await executeWorkflowThreads({
    schemaAwarenessData,
    format: "shorthand",
    input: output,
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
  });
}
