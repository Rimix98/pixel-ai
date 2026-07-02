// Rate limiter using in-memory Map with periodic cleanup.
// For production: consider Redis or database-backed implementation.

const rateLimit = new Map<string, { count: number; reset: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimit.get(key);

  if (!entry || now > entry.reset) {
    rateLimit.set(key, { count: 1, reset: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count++;
  return true;
}

export function getRateLimitStatus(key: string): { count: number; reset: number } | null {
  return rateLimit.get(key) || null;
}

// Periodic cleanup to prevent memory leak
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimit) {
      if (now > entry.reset) rateLimit.delete(key);
    }
  }, 60_000);
}
