"use server";

import jwt from "jsonwebtoken";

export async function getTiptapCloudCredentials() {
  const secret = process.env.TIPTAP_CLOUD_SECRET;
  const appId = process.env.TIPTAP_CLOUD_APP_ID;

  if (!secret || !appId) {
    throw new Error("Missing Tiptap Cloud credentials");
  }

  try {
    // Generate JWT token for Tiptap Cloud
    // The payload can be empty or contain user-specific claims
    const token = jwt.sign({}, secret, { algorithm: "HS256" });

    return {
      token,
      appId,
    };
  } catch (error) {
    console.error("Failed to generate Tiptap Cloud token:", error);
    throw new Error("Failed to generate Tiptap Cloud token");
  }
}

