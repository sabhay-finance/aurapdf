import { NextResponse } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory store for rate limiting
const ipBucket = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of ipBucket.entries()) {
    if (record.resetAt <= now) {
      ipBucket.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function checkRateLimit(
  identifier: string,
  limit: number = 60,
  windowSeconds: number = 60
): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const record = ipBucket.get(identifier);

  if (!record || record.resetAt <= now) {
    ipBucket.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: Math.ceil(windowMs / 1000),
    };
  }

  if (record.count >= limit) {
    const secondsUntilReset = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    return {
      success: false,
      limit,
      remaining: 0,
      reset: secondsUntilReset,
    };
  }

  record.count += 1;
  const secondsUntilReset = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
  return {
    success: true,
    limit,
    remaining: limit - record.count,
    reset: secondsUntilReset,
  };
}

export function createRateLimitResponse(resetSeconds: number) {
  return NextResponse.json(
    {
      success: false,
      error: 'Too many requests. Please slow down and try again later.',
    },
    {
      status: 429,
      headers: {
        'Retry-After': resetSeconds.toString(),
        'X-RateLimit-Reset': resetSeconds.toString(),
      },
    }
  );
}
