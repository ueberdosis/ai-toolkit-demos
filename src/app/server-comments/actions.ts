"use server";

import jwt from "jsonwebtoken";

const TIPTAP_CLOUD_SECRET = process.env.TIPTAP_CLOUD_SECRET;
const TIPTAP_CLOUD_DOCUMENT_SERVER_ID = process.env.TIPTAP_CLOUD_DOCUMENT_SERVER_ID;
const TIPTAP_CLOUD_COLLAB_BASE_URL = process.env.TIPTAP_CLOUD_COLLAB_BASE_URL;

export async function getCollabConfig(
  userId: string,
  documentName: string,
): Promise<{ token: string; appId: string; collabBaseUrl?: string }> {
  if (!TIPTAP_CLOUD_SECRET) {
    throw new Error("TIPTAP_CLOUD_SECRET environment variable is not set");
  }

  if (!TIPTAP_CLOUD_DOCUMENT_SERVER_ID) {
    throw new Error("TIPTAP_CLOUD_DOCUMENT_SERVER_ID environment variable is not set");
  }

  const payload = {
    sub: userId,
    allowedDocumentNames: [documentName],
  };

  const token = jwt.sign(payload, TIPTAP_CLOUD_SECRET, { expiresIn: "1h" });

  return {
    token,
    appId: TIPTAP_CLOUD_DOCUMENT_SERVER_ID,
    collabBaseUrl: TIPTAP_CLOUD_COLLAB_BASE_URL,
  };
}
