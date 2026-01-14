import { REST_API_SECRET, TIPTAP_CLOUD_APP_ID } from "./constants";

/**
 * Retrieves a document from Tiptap Collaboration REST API
 */
export async function getDocument(documentId: string): Promise<unknown> {
  if (!TIPTAP_CLOUD_APP_ID || !REST_API_SECRET) {
    throw new Error("Missing TIPTAP_CLOUD_APP_ID or REST_API_SECRET");
  }

  const collabUrl = `https://${TIPTAP_CLOUD_APP_ID}.collab.tiptap.cloud/api/documents/${encodeURIComponent(
    documentId,
  )}?format=json`;

  const response = await fetch(collabUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: REST_API_SECRET,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Document ${documentId} not found`);
    }
    throw new Error(
      `Failed to retrieve document: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}
