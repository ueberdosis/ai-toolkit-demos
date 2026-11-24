import { createPublicKey, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";

const sessionSchema = z.object({ sessionId: z.uuid() });
const audience = "clinical-workspace";
export const clinicalDocumentIdSchema = z.enum([
  "protocol",
  "consent",
  "safety",
  "analysis",
]);

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
