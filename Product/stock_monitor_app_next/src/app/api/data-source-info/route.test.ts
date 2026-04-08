import { afterEach, describe, expect, it } from "vitest";

import { GET } from "./route";

const ORIGINAL_ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const ORIGINAL_STOCKS_CACHE_TTL_SECONDS = process.env.STOCKS_CACHE_TTL_SECONDS;
const ORIGINAL_YAHOO_PRICE_CACHE_TTL_SECONDS = process.env.YAHOO_PRICE_CACHE_TTL_SECONDS;
const ORIGINAL_ALPHA_VANTAGE_PRICE_CACHE_TTL_SECONDS = process.env.ALPHA_VANTAGE_PRICE_CACHE_TTL_SECONDS;

afterEach(() => {
  if (ORIGINAL_ALPHA_VANTAGE_API_KEY == null) {
    delete process.env.ALPHA_VANTAGE_API_KEY;
  } else {
    process.env.ALPHA_VANTAGE_API_KEY = ORIGINAL_ALPHA_VANTAGE_API_KEY;
  }

  if (ORIGINAL_STOCKS_CACHE_TTL_SECONDS == null) {
    delete process.env.STOCKS_CACHE_TTL_SECONDS;
  } else {
    process.env.STOCKS_CACHE_TTL_SECONDS = ORIGINAL_STOCKS_CACHE_TTL_SECONDS;
  }

  if (ORIGINAL_YAHOO_PRICE_CACHE_TTL_SECONDS == null) {
    delete process.env.YAHOO_PRICE_CACHE_TTL_SECONDS;
  } else {
    process.env.YAHOO_PRICE_CACHE_TTL_SECONDS = ORIGINAL_YAHOO_PRICE_CACHE_TTL_SECONDS;
  }

  if (ORIGINAL_ALPHA_VANTAGE_PRICE_CACHE_TTL_SECONDS == null) {
    delete process.env.ALPHA_VANTAGE_PRICE_CACHE_TTL_SECONDS;
  } else {
    process.env.ALPHA_VANTAGE_PRICE_CACHE_TTL_SECONDS = ORIGINAL_ALPHA_VANTAGE_PRICE_CACHE_TTL_SECONDS;
  }
});

describe("GET /api/data-source-info", () => {
  it("returns masked alpha vantage key suffix only", async () => {
    process.env.ALPHA_VANTAGE_API_KEY = "my-super-secret-key-9X7A";
    process.env.STOCKS_CACHE_TTL_SECONDS = "180";
    process.env.YAHOO_PRICE_CACHE_TTL_SECONDS = "1800";
    process.env.ALPHA_VANTAGE_PRICE_CACHE_TTL_SECONDS = "2400";

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.apiKeySuffix).toBe("****9X7A");
    expect(payload.apiKeySuffix).not.toContain("super-secret");
    expect(JSON.stringify(payload)).not.toContain("my-super-secret-key");
    expect(payload.roles.yf).toContain("primary");
    expect(payload.roles.av).toContain("fallback");
    expect(payload.cacheStrategy).toHaveLength(3);
    expect(payload.callLimitGuidance).toHaveLength(2);
  });

  it("returns 未設定 when alpha vantage key is absent", async () => {
    delete process.env.ALPHA_VANTAGE_API_KEY;

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.apiKeySuffix).toBe("未設定");
  });
});
