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

// Periodic cleanup to prevent memory leak
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimit) {
      if (now > entry.reset) rateLimit.delete(key);
    }
  }, 60_000);
}
