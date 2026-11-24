"use server";

import { clinicalDocuments } from "@/demos/clinical-workspace/documents";
import {
  clinicalDocumentIdSchema,
  createWorkspaceSession,
  verifyWorkspaceSession,
  workspaceDocumentName,
} from "@/lib/clinical-workspace-session";
import { getCollabConfig } from "@/lib/collaboration";

export async function createClinicalWorkspace() {
  const { sessionId, token } = createWorkspaceSession();
  const documents = await Promise.all(
    clinicalDocuments.map(async ({ id }) => {
      const documentId = workspaceDocumentName(sessionId, id);
      return {
        id,
        documentId,
        config: await getCollabConfig("demo-user", documentId, token),
      };
    }),
  );
  return { token, documents };
}

/** Refresh only credentials for a document belonging to the signed workspace. */
export async function refreshClinicalDocumentToken(
  workspaceToken: string,
  id: string,
) {
  const { sessionId } = verifyWorkspaceSession(workspaceToken);
  const documentId = workspaceDocumentName(
    sessionId,
    clinicalDocumentIdSchema.parse(id),
  );
  const { token } = await getCollabConfig(
    "demo-user",
    documentId,
    workspaceToken,
  );
  return token;
}
