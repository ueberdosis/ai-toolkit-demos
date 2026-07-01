declare module "*.css";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // OpenAI API
      OPENAI_API_KEY?: string;

      // Anthropic API
      ANTHROPIC_API_KEY?: string;

      // Vercel AI Gateway
      AI_GATEWAY_API_KEY?: string;

      // Upstash Redis (for rate limiting)
      UPSTASH_REDIS_REST_URL?: string;
      UPSTASH_REDIS_REST_TOKEN?: string;

      // Tiptap Cloud AI (access-control auth)
      TIPTAP_CLOUD_AI_API_URL?: string;
      TIPTAP_AUTH_PRIVATE_KEY?: string;
      TIPTAP_AUTH_ENVIRONMENT_ID?: string;
      TIPTAP_CLOUD_COLLAB_BASE_URL?: string;
    }
  }
}
