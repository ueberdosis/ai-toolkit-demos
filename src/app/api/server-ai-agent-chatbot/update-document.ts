import { REST_API_SECRET, TIPTAP_CLOUD_APP_ID } from "./constants";

/**
 * Updates a document in Tiptap Collaboration REST API
 */
export async function updateDocument(
  documentId: string,
  document: unknown,
): Promise<void> {
  if (!TIPTAP_CLOUD_APP_ID || !REST_API_SECRET) {
    console.warn(
      "Missing TIPTAP_CLOUD_APP_ID or REST_API_SECRET, skipping update",
    );
    return;
  }

  const collabUrl = `https://${TIPTAP_CLOUD_APP_ID}.collab.tiptap.cloud/api/documents/${encodeURIComponent(
    documentId,
  )}?format=json`;

  try {
    const response = await fetch(collabUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: REST_API_SECRET,
      },
      body: JSON.stringify(document),
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Document doesn't exist, try to create it
        const createResponse = await fetch(collabUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: REST_API_SECRET,
          },
          body: JSON.stringify(document),
        });

        if (!createResponse.ok) {
          console.error(
            `Failed to create document: ${createResponse.status} ${createResponse.statusText}`,
          );
        }
      } else {
        console.error(
          `Failed to update document: ${response.status} ${response.statusText}`,
        );
      }
    }
  } catch (error) {
    console.error("Error updating document:", error);
  }
}
