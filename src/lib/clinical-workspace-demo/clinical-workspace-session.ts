import { createPublicKey, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { clinicalDocumentIdSchema } from "./workspace-documents";

export { clinicalDocumentIdSchema };

const sessionSchema = z.object({ sessionId: z.uuid() });
const audience = "clinical-workspace";

function signingKey() {
  const key = process.env.TIPTAP_AUTH_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!key) throw new Error("TIPTAP_AUTH_PRIVATE_KEY is not configured");
  return key;
}

export function createWorkspaceSession() {
  const sessionId = randomUUID();
  const token = jwt.sign({ sessionId }, signingKey(), {
    algorithm: "ES256",
    audience,
    expiresIn: "2h",
  });
  return { sessionId, token };
}

export function verifyWorkspaceSession(token: string) {
  return sessionSchema.parse(
    jwt.verify(token, createPublicKey(signingKey()), {
      algorithms: ["ES256"],
      audience,
    }),
  );
}

export function workspaceDocumentName(sessionId: string, documentId: string) {
  return `clinical-workspace/${z.uuid().parse(sessionId)}/${clinicalDocumentIdSchema.parse(documentId)}`;
}

/** Every credential path must honor the reserved clinical workspace namespace. */
export function assertDocumentAccess(
  documentName: string,
  workspaceToken?: string,
) {
  z.string().min(1).parse(documentName);
  if (documentName.includes("*")) {
    throw new Error("Wildcard document credentials are not allowed");
  }
  if (!documentName.startsWith("clinical-workspace/")) return;
  if (!workspaceToken)
    throw new Error("A clinical workspace session is required");
  const { sessionId } = verifyWorkspaceSession(workspaceToken);
  const id = documentName.slice(documentName.lastIndexOf("/") + 1);
  if (documentName !== workspaceDocumentName(sessionId, id)) {
    throw new Error("Document does not belong to this clinical workspace");
  }
}
