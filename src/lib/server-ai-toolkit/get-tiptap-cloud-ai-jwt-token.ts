import jwt from "jsonwebtoken";

/**
 * Generates an ES256-signed JWT for authenticating with the Tiptap AI Toolkit
 * API via the access-control flow.
 *
 * Requires:
 *   - TIPTAP_AUTH_PRIVATE_KEY — PEM-encoded ECDSA P-256 private key
 *     (issued once when the environment secret is created in Tiptap Cloud)
 *   - TIPTAP_AUTH_ENVIRONMENT_ID — `env_xxxxxxxx`, used as the `iss` claim
 *
 * The token grants `AI:Toolkit` + `AI:Generation` (so the AI server can run
 * tools) and `Documents:Read` + `Documents:Write` (so it can open a
 * Hocuspocus session on the user's behalf with the same JWT).
 */
export function getTiptapCloudAiJwtToken(): string {
  const privateKey = process.env.TIPTAP_AUTH_PRIVATE_KEY;
  const environmentId = process.env.TIPTAP_AUTH_ENVIRONMENT_ID;

  if (!privateKey) {
    throw new Error("TIPTAP_AUTH_PRIVATE_KEY environment variable is not set");
  }
  if (!environmentId) {
    throw new Error(
      "TIPTAP_AUTH_ENVIRONMENT_ID environment variable is not set",
    );
  }

  const payload = {
    permissions: [
      { action: "AI:Toolkit", resource: "*" },
      { action: "AI:Generation", resource: "*" },
      { action: "Documents:Read", resource: "*" },
      { action: "Documents:Write", resource: "*" },
    ],
  };

  return jwt.sign(payload, privateKey, {
    algorithm: "ES256",
    expiresIn: "1h",
    issuer: environmentId,
    audience: ["AI", "Documents"],
  });
}
