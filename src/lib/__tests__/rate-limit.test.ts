import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, getRateLimitStatus } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows first request", () => {
    const result = checkRateLimit("test-key-1", 5, 60_000);
    expect(result).toBe(true);
  });

  it("allows requests within limit", () => {
    for (let i = 0; i < 4; i++) {
      checkRateLimit("test-key-2", 5, 60_000);
    }
    const result = checkRateLimit("test-key-2", 5, 60_000);
    expect(result).toBe(true);
  });

  it("blocks requests over limit", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("test-key-3", 5, 60_000);
    }
    const result = checkRateLimit("test-key-3", 5, 60_000);
    expect(result).toBe(false);
  });

  it("tracks count correctly", () => {
    checkRateLimit("test-key-4", 10, 60_000);
    checkRateLimit("test-key-4", 10, 60_000);
    const status = getRateLimitStatus("test-key-4");
    expect(status).not.toBeNull();
    expect(status!.count).toBe(2);
  });

  it("different keys are independent", () => {
    checkRateLimit("key-a", 2, 60_000);
    checkRateLimit("key-a", 2, 60_000);
    // key-a is now at limit
    expect(checkRateLimit("key-a", 2, 60_000)).toBe(false);
    // key-b should still work
    expect(checkRateLimit("key-b", 2, 60_000)).toBe(true);
  });
});
