import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

let limiter: Ratelimit | undefined;

export async function rateLimit(ip: string): Promise<boolean> {
  limiter ??= new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(15, "1 m"),
    analytics: true,
    prefix: "multi-document-clinical-workspace/ratelimit",
  });
  const { success } = await limiter.limit(ip);
  return success;
}

export async function getIp(): Promise<string> {
  const nextjsHeaders = await headers();
  return nextjsHeaders.get("x-forwarded-for") || "127.0.0.1";
}
