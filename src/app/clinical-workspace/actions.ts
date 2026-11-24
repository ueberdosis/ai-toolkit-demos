"use server";

import { getCollabConfig } from "@/app/server-ai-agent-chatbot/actions";
import { clinicalDocuments } from "@/demos/clinical-workspace/documents";
import {
  createWorkspaceSession,
  workspaceDocumentName,
} from "@/lib/clinical-workspace-session";

export async function createClinicalWorkspace() {
  const { sessionId, token } = createWorkspaceSession();
  const documents = await Promise.all(
    clinicalDocuments.map(async ({ id }) => {
      const documentId = workspaceDocumentName(sessionId, id);
      return {
        id,
        documentId,
        config: await getCollabConfig("demo-user", documentId),
      };
    }),
  );
  return { token, documents };
}
