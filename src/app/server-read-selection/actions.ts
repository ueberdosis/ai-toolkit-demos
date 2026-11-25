"use server";

import jwt from "jsonwebtoken";

/**
 * Mints the Documents:Write collab token the browser provider uses to connect
 * to the shared document. Same pattern as the other collaborative demos.
 */
export async function getCollabConfig(
  userId: string,
  documentName: string,
): Promise<{ token: string; appId: string; collabBaseUrl?: string }> {
  const privateKey = process.env.TIPTAP_AUTH_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const environmentId = process.env.TIPTAP_AUTH_ENVIRONMENT_ID;
  const documentServerId = process.env.TIPTAP_CLOUD_DOCUMENT_SERVER_ID;
  const collabBaseUrl = process.env.TIPTAP_CLOUD_COLLAB_BASE_URL;

  if (!privateKey) {
    throw new Error("TIPTAP_AUTH_PRIVATE_KEY environment variable is not set");
  }
  if (!environmentId) {
    throw new Error(
      "TIPTAP_AUTH_ENVIRONMENT_ID environment variable is not set",
    );
  }
  if (!documentServerId) {
    throw new Error(
      "TIPTAP_CLOUD_DOCUMENT_SERVER_ID environment variable is not set",
    );
  }

  const token = jwt.sign(
    { permissions: [{ action: "Documents:Write", resource: documentName }] },
    privateKey,
    {
      algorithm: "ES256",
      audience: ["Documents"],
      expiresIn: "30m",
      issuer: environmentId,
      subject: userId,
    },
  );

  return { token, appId: documentServerId, collabBaseUrl };
}
