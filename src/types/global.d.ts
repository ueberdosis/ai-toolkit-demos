declare module "*.css";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // OpenAI API
      OPENAI_API_KEY?: string;

      // Anthropic API
      ANTHROPIC_API_KEY?: string;

      // Upstash Redis (for rate limiting)
      UPSTASH_REDIS_REST_URL?: string;
      UPSTASH_REDIS_REST_TOKEN?: string;

      // Tiptap Cloud
      TIPTAP_CLOUD_APP_ID?: string;
      TIPTAP_CLOUD_SECRET?: string;

      // Tiptap Cloud AI
      TIPTAP_CLOUD_AI_API_URL?: string;
      TIPTAP_CLOUD_AI_SECRET?: string;
      TIPTAP_CLOUD_AI_APP_ID?: string;

      // Tiptap Cloud Document Management
      TIPTAP_CLOUD_DOCUMENT_MANAGEMENT_API_SECRET?: string;
    }
  }
}
