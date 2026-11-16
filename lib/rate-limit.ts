import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type LimitResult = {
  success: boolean;
  remaining: number;
  reset: number;
  limit: number;
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/** احتياطي محلي فقط (لا يعمل عبر نسخ serverless متعددة) */
const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string): LimitResult {
  const now = Date.now();
  const cur = memoryBuckets.get(key);
  if (!cur || cur.resetAt <= now) {
    const resetAt = now + WINDOW_MS;
    memoryBuckets.set(key, { count: 1, resetAt });
    return { success: true, remaining: MAX_ATTEMPTS - 1, reset: resetAt, limit: MAX_ATTEMPTS };
  }
  if (cur.count >= MAX_ATTEMPTS) {
    return { success: false, remaining: 0, reset: cur.resetAt, limit: MAX_ATTEMPTS };
  }
  cur.count += 1;
  memoryBuckets.set(key, cur);
  return {
    success: true,
    remaining: Math.max(0, MAX_ATTEMPTS - cur.count),
    reset: cur.resetAt,
    limit: MAX_ATTEMPTS,
  };
}

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  return new Redis({ url, token });
}

let ipLimiter: Ratelimit | null = null;
let emailLimiter: Ratelimit | null = null;

function getIpLimiter(): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  if (!ipLimiter) {
    ipLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(MAX_ATTEMPTS, "15 m"),
      prefix: "login:ip",
      analytics: false,
    });
  }
  return ipLimiter;
}

function getEmailLimiter(): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  if (!emailLimiter) {
    emailLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(MAX_ATTEMPTS, "15 m"),
      prefix: "login:email",
      analytics: false,
    });
  }
  return emailLimiter;
}

async function runLimit(
  limiter: Ratelimit | null,
  key: string,
  memoryKey: string
): Promise<LimitResult> {
  if (!limiter) return memoryLimit(memoryKey);
  const res = await limiter.limit(key);
  return {
    success: res.success,
    remaining: res.remaining,
    reset: res.reset,
    limit: res.limit,
  };
}

export async function limitLoginByIp(ip: string): Promise<LimitResult> {
  return runLimit(getIpLimiter(), ip || "unknown", `ip:${ip || "unknown"}`);
}

export async function limitLoginByEmail(email: string): Promise<LimitResult> {
  const e = email.trim().toLowerCase() || "unknown";
  return runLimit(getEmailLimiter(), e, `email:${e}`);
}

export function retryAfterSeconds(resetMs: number): number {
  return Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
}

export function getClientIp(request: Request): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || headers.get("cf-connecting-ip")?.trim() || "unknown";
}
