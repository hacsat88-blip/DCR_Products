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

describe("/api/deep/radar-score", () => {
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

  it("returns validated scores and caches results", async () => {
    const modelBody = {
      scores: { growth: 72, value: 55, profit: 80, safety: 65, momentum: 48 },
      rationale: {
        growth: "売上成長が市場平均を上回る",
        value: "PER は業種中央値並み",
        profit: "高い ROE と利益率が安定",
        safety: "自己資本比率は健全",
        momentum: "直近 30 日はやや軟調",
      },
    };
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: JSON.stringify(modelBody) } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { POST } = await import("@/app/api/deep/radar-score/route");
    const res1 = await postJson(POST as unknown as (req: Request) => Promise<Response>, {
      fundamentals: { symbol: "7203", market: "JP", per: 12, pbr: 1.0, roe: 10 },
    });
    expect(res1.status).toBe(200);
    const json1 = (await res1.json()) as { scores: Record<string, number>; cached: boolean; overall: number };
    expect(json1.scores.growth).toBe(72);
    expect(json1.overall).toBeGreaterThan(0);
    expect(json1.cached).toBe(false);

    // Second identical call hits cache — fetch not invoked again.
    const res2 = await postJson(POST as unknown as (req: Request) => Promise<Response>, {
      fundamentals: { symbol: "7203", market: "JP", per: 12, pbr: 1.0, roe: 10 },
    });
    const json2 = (await res2.json()) as { cached: boolean };
    expect(json2.cached).toBe(true);
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it("rejects bad payloads", async () => {
    const { POST } = await import("@/app/api/deep/radar-score/route");
    const res = await postJson(POST as unknown as (req: Request) => Promise<Response>, {});
    expect(res.status).toBe(400);
  });
});
