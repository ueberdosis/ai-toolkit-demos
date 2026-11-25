const DEFAULT_SERVER_AI_TOOLKIT_API_URL = "https://api.tiptap.dev";
const DEFAULT_SERVER_AI_TOOLKIT_ORIGIN = "http://localhost:3000";

/**
 * Returns the base URL for Server AI Toolkit API requests.
 */
export function getServerAiToolkitApiBaseUrl(): string {
  return (
    process.env.TIPTAP_CLOUD_AI_API_URL || DEFAULT_SERVER_AI_TOOLKIT_API_URL
  );
}

/**
 * Returns the Origin header to forward to the Server AI Toolkit.
 */
export function getServerAiToolkitOrigin(): string {
  return process.env.TIPTAP_CLOUD_AI_ORIGIN || DEFAULT_SERVER_AI_TOOLKIT_ORIGIN;
}
