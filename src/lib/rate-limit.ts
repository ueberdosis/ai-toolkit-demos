import { headers } from "next/headers";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(15, "1 m"),
  analytics: true,
  prefix: "@upstash/ratelimit",
});

export async function rateLimit(ip: string): Promise<boolean> {
  const { success } = await ratelimit.limit(ip);
  return success;
}

export async function getIp(): Promise<string> {
  const nextjsHeaders = await headers();
  return nextjsHeaders.get("x-forwarded-for") || "127.0.0.1";
}
