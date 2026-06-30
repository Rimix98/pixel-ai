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

export function getRateLimitHeaders(key: string, limit: number, windowMs: number) {
  const entry = rateLimit.get(key);
  const remaining = entry ? Math.max(0, limit - entry.count) : limit;
  const reset = entry ? Math.ceil((entry.reset - Date.now()) / 1000) : Math.ceil(windowMs / 1000);

  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(reset),
  };
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
