import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/portfolio", () => ({
  snapshotDailyValuation: vi.fn(),
}));

import { POST } from "@/app/api/portfolio/snapshot/route";
import { snapshotDailyValuation } from "@/lib/services/portfolio";

const snapshotMock = vi.mocked(snapshotDailyValuation);
const ORIG_CRON_SECRET = process.env.CRON_SECRET;
const ORIG_CRON_KEY = process.env.CRON_KEY;

function makeReq(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/portfolio/snapshot", {
    method: "POST",
    headers,
  });
}

describe("/api/portfolio/snapshot POST auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
    delete process.env.CRON_KEY;
  });

  afterEach(() => {
    if (ORIG_CRON_SECRET === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = ORIG_CRON_SECRET;
    if (ORIG_CRON_KEY === undefined) delete process.env.CRON_KEY;
    else process.env.CRON_KEY = ORIG_CRON_KEY;
  });

  it("returns 503 when neither CRON_SECRET nor CRON_KEY is configured", async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("cron_auth_not_configured");
  });

  it("returns 401 when CRON_SECRET is set and Authorization header is missing or invalid", async () => {
    process.env.CRON_SECRET = "secret-value";

    const missing = await POST(makeReq());
    expect(missing.status).toBe(401);
    expect((await missing.json()).error).toBe("unauthorized");

    const invalid = await POST(
      makeReq({ authorization: "Bearer wrong-secret" }),
    );
    expect(invalid.status).toBe(401);
    expect((await invalid.json()).error).toBe("unauthorized");
  });

  it("accepts valid Authorization bearer token when CRON_SECRET is configured", async () => {
    process.env.CRON_SECRET = "secret-value";
    snapshotMock.mockResolvedValue({
      date: "2025-01-01",
      totalValueJpy: 1000,
      pnlJpy: 10,
      inserted: true,
    });

    const res = await POST(
      makeReq({
        authorization: "Bearer secret-value",
      }),
    );

    expect(res.status).toBe(200);
    expect(snapshotMock).toHaveBeenCalledTimes(1);
    const body = await res.json();
    expect(body.data).toEqual({
      date: "2025-01-01",
      totalValueJpy: 1000,
      pnlJpy: 10,
      inserted: true,
    });
  });

  it("rejects non-exact Authorization header values when CRON_SECRET is configured", async () => {
    process.env.CRON_SECRET = "secret-value";

    const lowerCaseBearer = await POST(
      makeReq({ authorization: "bearer secret-value" }),
    );
    expect(lowerCaseBearer.status).toBe(401);

    const extraSpaces = await POST(
      makeReq({ authorization: "Bearer    secret-value" }),
    );
    expect(extraSpaces.status).toBe(401);
  });

  it("prefers CRON_SECRET over legacy CRON_KEY when both are configured", async () => {
    process.env.CRON_SECRET = "secret-value";
    process.env.CRON_KEY = "legacy-key";

    const res = await POST(makeReq({ "x-cron-key": "legacy-key" }));

    expect(res.status).toBe(401);
    expect(snapshotMock).not.toHaveBeenCalled();
    expect((await res.json()).error).toBe("unauthorized");
  });

  it("falls back to legacy CRON_KEY and x-cron-key auth when CRON_SECRET is absent", async () => {
    process.env.CRON_KEY = "legacy-key";

    const invalid = await POST(makeReq({ "x-cron-key": "wrong-key" }));
    expect(invalid.status).toBe(401);
    expect((await invalid.json()).error).toBe("unauthorized");

    snapshotMock.mockResolvedValue({
      date: "2025-01-02",
      totalValueJpy: 1200,
      pnlJpy: 20,
      inserted: false,
    });
    const valid = await POST(makeReq({ "x-cron-key": "legacy-key" }));
    expect(valid.status).toBe(200);
    expect(snapshotMock).toHaveBeenCalledTimes(1);
    expect((await valid.json()).data).toEqual({
      date: "2025-01-02",
      totalValueJpy: 1200,
      pnlJpy: 20,
      inserted: false,
    });
  });
});
