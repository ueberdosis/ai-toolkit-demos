import jwt from "jsonwebtoken";

type TiptapAccessPermission = {
  action: "AI:Toolkit" | "Documents:Write" | "Documents:Api:All";
  resource: string;
};

export interface TiptapAccessTokenOptions {
  documentId?: string;
}

/**
 * Generates an ES256-signed JWT for authenticating with the Tiptap AI Toolkit
 * API with Tiptap Access Control.
 *
 * Requires:
 *   - TIPTAP_AUTH_PRIVATE_KEY — PEM-encoded ECDSA P-256 private key
 *     (issued once when the environment secret is created in Tiptap Cloud)
 *   - TIPTAP_AUTH_ENVIRONMENT_ID — `env_xxxxxxxx`, used as the `iss` claim
 */
export function getTiptapCloudAiJwtToken(
  options: TiptapAccessTokenOptions = {},
): string {
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

  const permissions: TiptapAccessPermission[] = [
    { action: "AI:Toolkit", resource: "*" },
  ];

  if (options.documentId) {
    permissions.push(
      {
        action: "Documents:Write",
        resource: options.documentId,
      },
      {
        action: "Documents:Api:All",
        resource: "*",
      },
    );
  }

  return jwt.sign({ permissions }, privateKey, {
    algorithm: "ES256",
    audience: options.documentId ? ["AI", "Documents"] : ["AI"],
    expiresIn: "30m",
    issuer: environmentId,
  });
}
