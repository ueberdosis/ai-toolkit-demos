/**
 * Retrieves a document from Tiptap Collaboration REST API
 */
export async function getDocument(
  documentId: string,
  collabBaseUrl?: string,
): Promise<unknown> {
  const tiptapCloudAppId = process.env.TIPTAP_CLOUD_APP_ID;
  const documentManagementApiSecret =
    process.env.TIPTAP_CLOUD_DOCUMENT_MANAGEMENT_API_SECRET;

  if (!collabBaseUrl && !tiptapCloudAppId) {
    throw new Error("Missing TIPTAP_CLOUD_APP_ID");
  }

  if (!documentManagementApiSecret) {
    throw new Error("Missing TIPTAP_CLOUD_DOCUMENT_MANAGEMENT_API_SECRET");
  }

  const baseUrl =
    collabBaseUrl ?? `https://${tiptapCloudAppId}.collab.tiptap.cloud`;
  const collabUrl = `${baseUrl}/api/documents/${encodeURIComponent(
    documentId,
  )}?format=json`;

  const response = await fetch(collabUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: documentManagementApiSecret,
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
