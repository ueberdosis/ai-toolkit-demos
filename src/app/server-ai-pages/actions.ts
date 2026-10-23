"use server";

import { signTiptapAccessToken } from "@/lib/sign-tiptap-access-token";

export type ConvertTokenResult = { token: string } | { error: string };

/**
 * Mints the token the DOCX import extension sends to Tiptap Conversion.
 * Imports carry the collaboration document name, so the token also grants
 * `Documents:Write` on that one document for imported comments.
 */
export async function getConvertToken(
  documentId: string,
): Promise<ConvertTokenResult> {
  try {
    return {
      token: signTiptapAccessToken({
        audience: ["Convert", "Documents"],
        permissions: [
          { action: "Convert:Import:Docx", resource: "*" },
          { action: "Documents:Write", resource: documentId },
        ],
        expiresIn: "1h",
        subject: "user-1",
      }),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
