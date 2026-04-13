import { getTiptapCloudAiJwtToken } from "./get-tiptap-cloud-ai-jwt-token";

export type WorkflowFormat = "json" | "shorthand";

interface ReviewOptions {
  mode?: "disabled" | "trackedChanges";
  trackedChangesOptions?: {
    userId: string;
    userMetadata?: Record<string, unknown> | null;
  };
}

interface InlineDocumentSource {
  document: unknown;
  experimental_documentOptions?: never;
}

interface RemoteDocumentSource {
  document?: never;
  experimental_documentOptions: {
    documentId: string;
    userId?: string | null;
  };
}

type DocumentSource = InlineDocumentSource | RemoteDocumentSource;

async function postWorkflowRequest<TResponse>(
  path: string,
  body: unknown,
): Promise<TResponse> {
  const apiBaseUrl =
    process.env.TIPTAP_CLOUD_AI_API_URL || "https://api.tiptap.dev/v3/ai";
  const appId = process.env.TIPTAP_CLOUD_AI_APP_ID;

  if (!appId) {
    throw new Error("Missing TIPTAP_CLOUD_AI_APP_ID");
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getTiptapCloudAiJwtToken()}`,
      "X-App-Id": appId,
      Origin: "http://localhost:3000",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Server AI Toolkit request failed for ${path}: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`,
    );
  }

  return response.json() as Promise<TResponse>;
}

export async function getWorkflowDefinition(
  name: "edit" | "proofreader" | "threads",
  format: WorkflowFormat,
) {
  return postWorkflowRequest<{
    systemPrompt: string;
    outputSchema: Record<string, unknown>;
  }>(`/toolkit/workflows/${name}`, {
    format,
  });
}

export async function readWorkflowDocument(
  input: {
    schemaAwarenessData: unknown;
    format: WorkflowFormat;
    range: { from: number; to: number };
    sessionId?: string | null;
    reviewOptions?: ReviewOptions;
  } & DocumentSource,
) {
  return postWorkflowRequest<{
    sessionId: string;
    output: {
      success: boolean;
      content?: unknown;
      error?: string;
    };
    docChanged: boolean;
    document: Record<string, unknown> | null;
  }>("/toolkit/read/read-document", input);
}

export async function readWorkflowSelection(
  input: {
    schemaAwarenessData: unknown;
    format: WorkflowFormat;
    range: { from: number; to: number };
    sessionId?: string | null;
    reviewOptions?: ReviewOptions;
  } & DocumentSource,
) {
  return postWorkflowRequest<{
    sessionId: string;
    output:
      | {
          isEmpty: false;
          content: unknown;
          nodeHashes: string[];
          nodeRange: { from: number; to: number };
          prompt: string;
        }
      | {
          isEmpty: true;
        };
    docChanged: boolean;
    document: Record<string, unknown> | null;
  }>("/toolkit/read/read-selection", input);
}

export async function readWorkflowThreads(input: {
  schemaAwarenessData: unknown;
  format: WorkflowFormat;
  experimental_documentOptions: {
    documentId: string;
    userId?: string | null;
  };
}) {
  return postWorkflowRequest<{
    output: {
      threads?: unknown[];
      error?: string;
    };
    docChanged: boolean;
    document: Record<string, unknown> | null;
  }>("/toolkit/read/threads", input);
}

export async function executeWorkflowEdit(
  input: {
    schemaAwarenessData: unknown;
    format: WorkflowFormat;
    input: unknown;
    sessionId?: string | null;
    reviewOptions?: ReviewOptions;
  } & DocumentSource,
) {
  return postWorkflowRequest<{
    sessionId: string;
    output: {
      operationResults?: Array<{
        target: string;
        success: boolean;
        error: string | null;
      }>;
      reason?: "validationError" | "unexpectedError";
      error?: string;
    };
    docChanged: boolean;
    document: Record<string, unknown> | null;
  }>("/toolkit/execute-workflow/edit", input);
}

export async function executeWorkflowProofreader(
  input: {
    schemaAwarenessData: unknown;
    input: unknown;
    sessionId?: string | null;
    reviewOptions?: ReviewOptions;
    format: "shorthand";
  } & DocumentSource,
) {
  return postWorkflowRequest<{
    sessionId: string;
    output: {
      operationResults: Array<{
        target: string;
        success: boolean;
        error: string | null;
      }>;
    };
    docChanged: boolean;
    document: Record<string, unknown> | null;
  }>("/toolkit/execute-workflow/proofreader", input);
}

export async function executeWorkflowInsertContent(
  input: {
    schemaAwarenessData: unknown;
    format: WorkflowFormat;
    input: unknown;
    range?: { from: number; to: number };
    sessionId?: string | null;
    reviewOptions?: ReviewOptions;
  } & DocumentSource,
) {
  return postWorkflowRequest<{
    sessionId: string;
    output: {
      error?: string;
    };
    docChanged: boolean;
    document: Record<string, unknown> | null;
  }>("/toolkit/execute-workflow/insert-content", input);
}

export async function executeWorkflowThreads(input: {
  schemaAwarenessData: unknown;
  format: WorkflowFormat;
  input: unknown;
  experimental_documentOptions: {
    documentId: string;
    userId?: string | null;
  };
  experimental_commentsOptions?: {
    threadData?: Record<string, unknown>;
    commentData?: Record<string, unknown>;
  };
}) {
  return postWorkflowRequest<{
    output: {
      operations?: Array<{
        type: string;
        success: boolean;
        message: string;
        threadId?: string;
      }>;
      error?: string;
    };
    docChanged: boolean;
    document: Record<string, unknown> | null;
  }>("/toolkit/execute-workflow/threads", input);
}
