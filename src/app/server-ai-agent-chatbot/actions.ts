"use server";

import { getTiptapCloudAiJwtToken } from "../../lib/server-ai-toolkit/get-tiptap-cloud-ai-jwt-token";

const TIPTAP_CLOUD_DOCUMENT_SERVER_ID =
  process.env.TIPTAP_CLOUD_DOCUMENT_SERVER_ID;
const TIPTAP_CLOUD_COLLAB_BASE_URL = process.env.TIPTAP_CLOUD_COLLAB_BASE_URL;

/**
 * Returns the collab provider config (token + appId/baseUrl).
 *
 * The token is the same multi-audience JWT we mint for the AI server. It
 * carries `aud: ["AI", "Documents"]` plus `Documents:Read`/`Documents:Write`
 * permissions, so Tiptap Cloud accepts it for both the AI Toolkit and the
 * Hocuspocus WebSocket on the same login. `userId` and `documentName` are
 * kept in the signature for compatibility with existing callers but are no
 * longer used by the access-control auth flow.
 */
export async function getCollabConfig(
  _userId: string,
  _documentName: string,
): Promise<{ token: string; appId: string; collabBaseUrl?: string }> {
  if (!TIPTAP_CLOUD_DOCUMENT_SERVER_ID) {
    throw new Error(
      "TIPTAP_CLOUD_DOCUMENT_SERVER_ID environment variable is not set",
    );
  }

  return {
    token: getTiptapCloudAiJwtToken(),
    appId: TIPTAP_CLOUD_DOCUMENT_SERVER_ID,
    collabBaseUrl: TIPTAP_CLOUD_COLLAB_BASE_URL,
  };
}
