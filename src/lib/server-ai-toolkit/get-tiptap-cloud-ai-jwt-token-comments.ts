import jwt from "jsonwebtoken";

/**
 * Generates a JWT token for comments flows, including document management payload fields.
 */
export function getTiptapCloudAiJwtTokenComments(): string {
  const secret = process.env.TIPTAP_CLOUD_AI_SECRET;
  if (!secret) {
    throw new Error("TIPTAP_CLOUD_AI_SECRET environment variable is not set");
  }

  const payload = {
    experimental_document_app_id: process.env.TIPTAP_CLOUD_APP_ID,
    experimental_document_secret:
      process.env.TIPTAP_CLOUD_DOCUMENT_MANAGEMENT_API_SECRET,
  };

  return jwt.sign(payload, secret, { expiresIn: "1h" });
}
