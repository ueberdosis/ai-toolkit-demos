import jwt from "jsonwebtoken";

/**
 * Generates a JWT token from TIPTAP_CLOUD_AI_SECRET for authenticating with the AI Toolkit API
 */
export function getTiptapCloudAiJwtToken(): string {
  const secret = process.env.TIPTAP_CLOUD_AI_SECRET;
  if (!secret) {
    throw new Error("TIPTAP_CLOUD_AI_SECRET environment variable is not set");
  }

  const payload = {};

  return jwt.sign(payload, secret, { expiresIn: "1h" });
}
