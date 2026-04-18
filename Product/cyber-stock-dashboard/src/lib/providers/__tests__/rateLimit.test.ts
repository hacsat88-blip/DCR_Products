import { describe, it, expect } from "vitest";
import { createRateLimiter } from "@/lib/providers/rateLimit";

describe("createRateLimiter", () => {
  it("enforces minIntervalMs spacing between tasks", async () => {
    const limiter = createRateLimiter({ minIntervalMs: 50 });
    const starts: number[] = [];
    const t0 = Date.now();
    await Promise.all(
      [0, 1, 2].map(() =>
        limiter.schedule(async () => {
          starts.push(Date.now() - t0);
        }),
      ),
    );
    expect(starts.length).toBe(3);
    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(45);
    expect(starts[2] - starts[1]).toBeGreaterThanOrEqual(45);
  });

  it("enforces rolling window cap", async () => {
    const limiter = createRateLimiter({ maxPerWindow: 2, windowMs: 100 });
    const starts: number[] = [];
    const t0 = Date.now();
    await Promise.all(
      Array.from({ length: 4 }, () =>
        limiter.schedule(async () => {
          starts.push(Date.now() - t0);
        }),
      ),
    );
    expect(starts[2]).toBeGreaterThanOrEqual(95);
    expect(starts[3]).toBeGreaterThanOrEqual(95);
  });

  it("propagates task errors", async () => {
    const limiter = createRateLimiter();
    await expect(
      limiter.schedule(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });
});
