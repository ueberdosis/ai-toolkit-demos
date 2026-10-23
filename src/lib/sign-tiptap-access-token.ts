import jwt, { type SignOptions } from "jsonwebtoken";

export type TiptapAccessAudience = "AI" | "Convert" | "Documents";

export type TiptapAccessPermission = {
  action: "AI:Toolkit" | "Convert:Import:Docx" | "Documents:Write";
  resource: string;
};

export interface SignTiptapAccessTokenOptions {
  audience: TiptapAccessAudience | TiptapAccessAudience[];
  permissions: TiptapAccessPermission[];
  expiresIn: NonNullable<SignOptions["expiresIn"]>;
  subject?: string;
}

/**
 * Signs an ES256 JWT for Tiptap Access Control. Server-only: reads the
 * signing key from the environment and throws when it is missing.
 *
 * Requires:
 *   - TIPTAP_AUTH_PRIVATE_KEY — PEM-encoded ECDSA P-256 private key
 *     (issued once when the environment secret is created in Tiptap Cloud)
 *   - TIPTAP_AUTH_ENVIRONMENT_ID — `env_xxxxxxxx`, used as the `iss` claim
 */
export function signTiptapAccessToken({
  audience,
  permissions,
  expiresIn,
  subject,
}: SignTiptapAccessTokenOptions): string {
  const privateKey = process.env.TIPTAP_AUTH_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const environmentId = process.env.TIPTAP_AUTH_ENVIRONMENT_ID;

  if (!privateKey) {
    throw new Error("TIPTAP_AUTH_PRIVATE_KEY environment variable is not set");
  }

  if (!environmentId) {
    throw new Error(
      "TIPTAP_AUTH_ENVIRONMENT_ID environment variable is not set",
    );
  }

  return jwt.sign({ permissions }, privateKey, {
    algorithm: "ES256",
    audience,
    expiresIn,
    issuer: environmentId,
    ...(subject ? { subject } : {}),
  });
}
