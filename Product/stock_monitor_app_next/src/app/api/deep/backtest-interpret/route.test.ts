import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { __resetRateLimiter } from "@/lib/rateLimiter";
import { __resetLlmCache } from "@/lib/llmCache";

const originalFetch = globalThis.fetch;

async function postJson(handler: (req: Request) => Promise<Response>, body: unknown): Promise<Response> {
  const req = new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handler(req as unknown as Request & { nextUrl?: URL });
}

const VALID_PAYLOAD = {
  initialCapital: 10_000,
  strategy: "sma_cross" as const,
  metrics: { total: 12.3, sharpe: 1.1, dd: 8.5, winRate: 55 },
  notableTrades: [
    { entry: 100, exit: 110, pnlPct: 10 },
    { entry: 110, exit: 105, pnlPct: -4.5 },
  ],
};

const MODEL_BODY = {
  summary: "sma_cross は穏やかなトレンド相場で機能した。",
  strengths: ["明瞭なトレンド捕捉", "DD が限定的"],
  weaknesses: ["横ばいでシグナル頻発", "winRate が中位"],
  improvementIdeas: ["ボラフィルタ追加", "スロー期間最適化"],
  riskNotes: ["サンプル期間が短い", "スリッページ仮定が楽観的"],
};

describe("/api/deep/backtest-interpret", () => {
  beforeEach(() => {
    __resetRateLimiter();
    __resetLlmCache();
    process.env.OPENROUTER_API_KEY = "test-key";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.OPENROUTER_API_KEY;
    vi.restoreAllMocks();
  });

  it("returns validated interpretation and caches results", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: JSON.stringify(MODEL_BODY) } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { POST } = await import("@/app/api/deep/backtest-interpret/route");

    const res1 = await postJson(POST as unknown as (req: Request) => Promise<Response>, VALID_PAYLOAD);
    expect(res1.status).toBe(200);
    const json1 = (await res1.json()) as {
      summary: string;
      strengths: string[];
      cached: boolean;
    };
    expect(json1.summary).toContain("sma_cross");
    expect(json1.strengths.length).toBeGreaterThan(0);
    expect(json1.cached).toBe(false);

    const res2 = await postJson(POST as unknown as (req: Request) => Promise<Response>, VALID_PAYLOAD);
    const json2 = (await res2.json()) as { cached: boolean };
    expect(json2.cached).toBe(true);
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it("rejects invalid payload with 400", async () => {
    const { POST } = await import("@/app/api/deep/backtest-interpret/route");
    const res = await postJson(POST as unknown as (req: Request) => Promise<Response>, {
      initialCapital: -5,
      strategy: "unknown",
    });
    expect(res.status).toBe(400);
  });

  it("returns 503 when API key is missing", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const { POST } = await import("@/app/api/deep/backtest-interpret/route");
    const res = await postJson(POST as unknown as (req: Request) => Promise<Response>, VALID_PAYLOAD);
    expect(res.status).toBe(503);
  });
});
