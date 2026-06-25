import { getTiptapCloudAiJwtToken } from "./get-tiptap-cloud-ai-jwt-token";

/**
 * Generates a Tiptap Access Control JWT for comments flows.
 */
export function getTiptapCloudAiJwtTokenComments(documentId?: string): string {
  return getTiptapCloudAiJwtToken({ documentId });
}
