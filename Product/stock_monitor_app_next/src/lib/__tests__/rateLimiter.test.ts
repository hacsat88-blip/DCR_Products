import { describe, it, expect, beforeEach } from "vitest";

import {
  consume,
  reportBackoff,
  clearBackoff,
  snapshot,
  RateLimitExceededError,
  __resetRateLimiter,
} from "@/lib/rateLimiter";

describe("rateLimiter", () => {
  beforeEach(() => {
    __resetRateLimiter();
  });

  it("allows calls up to the per-minute cap and then throws", () => {
    const rule = { key: "demo", perMinute: 3 };
    consume(rule);
    consume(rule);
    consume(rule);
    expect(() => consume(rule)).toThrow(RateLimitExceededError);
  });

  it("enforces a backoff window", () => {
    const rule = { key: "demo", perMinute: 10 };
    consume(rule);
    reportBackoff("demo", 10_000, "429");
    expect(() => consume(rule)).toThrow(RateLimitExceededError);
    clearBackoff("demo");
    expect(() => consume(rule)).not.toThrow();
  });

  it("exposes a snapshot of remaining capacity", () => {
    const rule = { key: "demo", perMinute: 5, perDay: 50 };
    consume(rule);
    consume(rule);
    const [state] = snapshot();
    expect(state.key).toBe("demo");
    expect(state.remainingMinute).toBe(3);
    expect(state.remainingDay).toBe(48);
  });
});
