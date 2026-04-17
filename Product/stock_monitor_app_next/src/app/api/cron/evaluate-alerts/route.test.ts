import { describe, it, expect, beforeEach, afterEach } from "vitest";

import type { AlertRule } from "@/store/useAlertsStore";

async function postJson(
  handler: (req: Request) => Promise<Response>,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  const req = new Request("http://localhost/api/cron/evaluate-alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return handler(req as unknown as Request & { nextUrl?: URL });
}

const RULE: AlertRule = {
  id: "r1",
  symbol: "7203",
  market: "JP",
  condition: { op: ">=", target: 100, field: "price" },
  notifyChannels: ["discord"],
  enabled: true,
  createdAt: new Date().toISOString(),
};

describe("/api/cron/evaluate-alerts", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "top-secret";
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("rejects requests without authorization with 401", async () => {
    const { POST } = await import("@/app/api/cron/evaluate-alerts/route");
    const res = await postJson(POST as unknown as (req: Request) => Promise<Response>, {
      rules: [RULE],
      snapshots: { "7203": { price: 105 } },
    });
    expect(res.status).toBe(401);
  });

  it("returns evaluated and triggered entries when auth is valid", async () => {
    const { POST } = await import("@/app/api/cron/evaluate-alerts/route");
    const res = await postJson(
      POST as unknown as (req: Request) => Promise<Response>,
      {
        rules: [RULE, { ...RULE, id: "r2", enabled: false }],
        snapshots: { "7203": { price: 105 } },
      },
      { authorization: "Bearer top-secret" },
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      evaluated: number;
      triggered: Array<{ ruleId: string; reason: string }>;
    };
    expect(json.evaluated).toBe(2);
    expect(json.triggered).toHaveLength(1);
    expect(json.triggered[0].ruleId).toBe("r1");
  });

  it("returns 503 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const { POST } = await import("@/app/api/cron/evaluate-alerts/route");
    const res = await postJson(
      POST as unknown as (req: Request) => Promise<Response>,
      { rules: [RULE], snapshots: { "7203": { price: 105 } } },
      { authorization: "Bearer anything" },
    );
    expect(res.status).toBe(503);
  });
});
