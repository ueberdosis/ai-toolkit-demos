import {
  signTiptapAccessToken,
  type TiptapAccessPermission,
} from "@/lib/sign-tiptap-access-token";

export interface TiptapAccessTokenOptions {
  documentId?: string;
}

/**
 * Generates an ES256-signed JWT for authenticating with the Tiptap AI Toolkit
 * API with Tiptap Access Control.
 */
export function getTiptapCloudAiJwtToken(
  options: TiptapAccessTokenOptions = {},
): string {
  const permissions: TiptapAccessPermission[] = [
    { action: "AI:Toolkit", resource: "*" },
  ];

  if (options.documentId) {
    permissions.push({
      action: "Documents:Write",
      resource: options.documentId,
    });
  }

  return signTiptapAccessToken({
    permissions,
    audience: options.documentId ? ["AI", "Documents"] : ["AI"],
    expiresIn: "30m",
  });
}
