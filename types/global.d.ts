declare module "*.css"

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      UPSTASH_REDIS_REST_URL?: string;
      TIPTAP_CLOUD_APP_ID: string;
      REST_API_SECRET: string;
      TIPTAP_CLOUD_SECRET?: string;
    }
  }
}

export {}
