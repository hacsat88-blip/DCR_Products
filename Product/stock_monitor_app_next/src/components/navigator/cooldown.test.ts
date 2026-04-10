import { describe, expect, it } from "vitest";

import type { NavigatorRetryState } from "@/types/navigator";

import { getRetryCooldownState } from "./cooldown";

describe("getRetryCooldownState", () => {
  it("returns active cooldown info while retryAt is still in the future", () => {
    const retryState: NavigatorRetryState = {
      reason: "rate_limit",
      retryAfterSeconds: 60,
      retryAt: "2026-04-08T08:01:00.000Z",
    };

    expect(getRetryCooldownState(retryState, Date.parse("2026-04-08T08:00:00.000Z"))).toEqual({
      active: true,
      retryLabel: "約1分後に再試行",
    });
  });

  it("returns inactive cooldown info after retryAt has passed", () => {
    const retryState: NavigatorRetryState = {
      reason: "rate_limit",
      retryAfterSeconds: 60,
      retryAt: "2026-04-08T08:01:00.000Z",
    };

    expect(getRetryCooldownState(retryState, Date.parse("2026-04-08T08:02:00.000Z"))).toEqual({
      active: false,
      retryLabel: "約1分後に再試行",
    });
  });

  it("ignores malformed retryAt values instead of treating them as active cooldowns", () => {
    const retryState: NavigatorRetryState = {
      reason: "rate_limit",
      retryAfterSeconds: 60,
      retryAt: "2999",
    };

    expect(getRetryCooldownState(retryState, Date.parse("2026-04-08T08:00:00.000Z"))).toEqual({
      active: false,
      retryLabel: "約1分後に再試行",
    });
  });

  it("falls back to a generic label when retryAfterSeconds is non-finite", () => {
    const retryState: NavigatorRetryState = {
      reason: "rate_limit",
      retryAfterSeconds: Number.NaN,
      retryAt: "2026-04-08T08:01:00.000Z",
    };

    expect(getRetryCooldownState(retryState, Date.parse("2026-04-08T08:00:00.000Z"))).toEqual({
      active: true,
      retryLabel: "少し時間をおいて再試行",
    });
  });
});
