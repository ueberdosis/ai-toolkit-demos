/**
 * Updates a document in Tiptap Collaboration REST API
 */
export async function updateDocument(
  documentId: string,
  document: unknown,
  collabBaseUrl?: string,
): Promise<void> {
  const tiptapCloudAppId = process.env.TIPTAP_CLOUD_APP_ID;
  const documentManagementApiSecret =
    process.env.TIPTAP_CLOUD_DOCUMENT_MANAGEMENT_API_SECRET;

  if (!collabBaseUrl && !tiptapCloudAppId) {
    console.warn("Missing TIPTAP_CLOUD_APP_ID, skipping update");
    return;
  }

  if (!documentManagementApiSecret) {
    console.warn(
      "Missing TIPTAP_CLOUD_DOCUMENT_MANAGEMENT_API_SECRET, skipping update",
    );
    return;
  }

  const baseUrl =
    collabBaseUrl ?? `https://${tiptapCloudAppId}.collab.tiptap.cloud`;
  const collabUrl = `${baseUrl}/api/documents/${encodeURIComponent(
    documentId,
  )}?format=json`;

  try {
    const response = await fetch(collabUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: documentManagementApiSecret,
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
            Authorization: documentManagementApiSecret,
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
