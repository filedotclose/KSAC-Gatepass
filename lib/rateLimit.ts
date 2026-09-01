import { NextRequest } from "next/server";

interface RateLimitRecord {
  count: number;
  firstAttemptTime: number;
  lastAttemptTime: number;
}

// In-memory rate limiting stores
const authRateLimitStore = new Map<string, RateLimitRecord>();
const generalRateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    // Clean auth store (older than 15 mins)
    for (const [key, record] of authRateLimitStore.entries()) {
      if (now - record.firstAttemptTime > 15 * 60 * 1000) {
        authRateLimitStore.delete(key);
      }
    }
    // Clean general store (older than 1 min)
    for (const [key, record] of generalRateLimitStore.entries()) {
      if (now - record.firstAttemptTime > 60 * 1000) {
        generalRateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Extracts client IP address reliably from request headers.
 */
export function getClientIp(req: Request | NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip") || req.headers.get("cf-connecting-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfterSeconds: number;
}

/**
 * Rate Limiter for Authentication Routes (/api/auth/login)
 * Rule: Maximum 8 attempts per 15 minutes per IP + account identifier.
 */
export function checkAuthRateLimit(identifier: string): RateLimitResult {
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  const MAX_ATTEMPTS = 8;
  const now = Date.now();

  const record = authRateLimitStore.get(identifier);

  if (!record) {
    authRateLimitStore.set(identifier, {
      count: 1,
      firstAttemptTime: now,
      lastAttemptTime: now,
    });
    return {
      allowed: true,
      limit: MAX_ATTEMPTS,
      remaining: MAX_ATTEMPTS - 1,
      resetTime: Math.ceil((now + WINDOW_MS) / 1000),
      retryAfterSeconds: 0,
    };
  }

  // Check if window has expired
  if (now - record.firstAttemptTime > WINDOW_MS) {
    record.count = 1;
    record.firstAttemptTime = now;
    record.lastAttemptTime = now;
    return {
      allowed: true,
      limit: MAX_ATTEMPTS,
      remaining: MAX_ATTEMPTS - 1,
      resetTime: Math.ceil((now + WINDOW_MS) / 1000),
      retryAfterSeconds: 0,
    };
  }

  // Increment attempt
  record.count += 1;
  record.lastAttemptTime = now;

  const resetTimeMs = record.firstAttemptTime + WINDOW_MS;
  const retryAfterSeconds = Math.max(1, Math.ceil((resetTimeMs - now) / 1000));
  const remaining = Math.max(0, MAX_ATTEMPTS - record.count);

  if (record.count > MAX_ATTEMPTS) {
    return {
      allowed: false,
      limit: MAX_ATTEMPTS,
      remaining: 0,
      resetTime: Math.ceil(resetTimeMs / 1000),
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    limit: MAX_ATTEMPTS,
    remaining,
    resetTime: Math.ceil(resetTimeMs / 1000),
    retryAfterSeconds: 0,
  };
}

/**
 * Rate Limiter for General API Routes (/api/pass/*, /api/room-booking/*)
 * Rule: Maximum 60 requests per 1 minute per IP.
 */
export function checkGeneralRateLimit(identifier: string): RateLimitResult {
  const WINDOW_MS = 60 * 1000; // 1 minute
  const MAX_REQUESTS = 60;
  const now = Date.now();

  const record = generalRateLimitStore.get(identifier);

  if (!record) {
    generalRateLimitStore.set(identifier, {
      count: 1,
      firstAttemptTime: now,
      lastAttemptTime: now,
    });
    return {
      allowed: true,
      limit: MAX_REQUESTS,
      remaining: MAX_REQUESTS - 1,
      resetTime: Math.ceil((now + WINDOW_MS) / 1000),
      retryAfterSeconds: 0,
    };
  }

  if (now - record.firstAttemptTime > WINDOW_MS) {
    record.count = 1;
    record.firstAttemptTime = now;
    record.lastAttemptTime = now;
    return {
      allowed: true,
      limit: MAX_REQUESTS,
      remaining: MAX_REQUESTS - 1,
      resetTime: Math.ceil((now + WINDOW_MS) / 1000),
      retryAfterSeconds: 0,
    };
  }

  record.count += 1;
  record.lastAttemptTime = now;

  const resetTimeMs = record.firstAttemptTime + WINDOW_MS;
  const retryAfterSeconds = Math.max(1, Math.ceil((resetTimeMs - now) / 1000));
  const remaining = Math.max(0, MAX_REQUESTS - record.count);

  if (record.count > MAX_REQUESTS) {
    return {
      allowed: false,
      limit: MAX_REQUESTS,
      remaining: 0,
      resetTime: Math.ceil(resetTimeMs / 1000),
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    limit: MAX_REQUESTS,
    remaining,
    resetTime: Math.ceil(resetTimeMs / 1000),
    retryAfterSeconds: 0,
  };
}

/**
 * Attaches standard rate limit headers to a NextResponse.
 */
export function setRateLimitHeaders(headers: Headers, result: RateLimitResult): void {
  headers.set("X-RateLimit-Limit", result.limit.toString());
  headers.set("X-RateLimit-Remaining", result.remaining.toString());
  headers.set("X-RateLimit-Reset", result.resetTime.toString());
  if (!result.allowed) {
    headers.set("Retry-After", result.retryAfterSeconds.toString());
  }
}
