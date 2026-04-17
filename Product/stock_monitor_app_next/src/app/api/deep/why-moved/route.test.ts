import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { __resetRateLimiter } from "@/lib/rateLimiter";
import { __resetLlmCache } from "@/lib/llmCache";

const originalFetch = globalThis.fetch;

async function postJson(
  handler: (req: Request) => Promise<Response>,
  body: unknown,
): Promise<Response> {
  const req = new Request("http://localhost/api/deep/why-moved", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  // Next's NextRequest exposes nextUrl; the route reads req.nextUrl.origin.
  (req as unknown as { nextUrl: URL }).nextUrl = new URL(req.url);
  return handler(req);
}

describe("/api/deep/why-moved", () => {
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

  it("returns parsed drivers and caches results", async () => {
    const modelBody = {
      ticker: "7203",
      move_summary: "決算上振れで+4.2%",
      likely_drivers: [
        { factor: "決算上方修正", evidence: "通期OP+12%へ上方修正（TDnet）", confidence: "high" },
        { factor: "業種物色", evidence: "自動車セクター全体が堅調", confidence: "medium" },
      ],
      notable_sources: ["https://example.com/tdnet/7203"],
      risk_note: "出来高は平均比1.2倍のみ",
    };
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: JSON.stringify(modelBody) } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { POST } = await import("@/app/api/deep/why-moved/route");
    const res1 = await postJson(POST as unknown as (req: Request) => Promise<Response>, {
      ticker: "7203",
      moveContext: "+4.2% on 2x volume",
    });
    expect(res1.status).toBe(200);
    const json1 = (await res1.json()) as {
      ticker: string;
      likely_drivers: Array<{ factor: string; confidence: string }>;
      cached: boolean;
      model_used: string;
    };
    expect(json1.ticker).toBe("7203");
    expect(json1.likely_drivers).toHaveLength(2);
    expect(json1.likely_drivers[0].confidence).toBe("high");
    expect(json1.model_used).toContain("gpt-oss-120b");
    expect(json1.cached).toBe(false);

    // Cache hit on identical payload
    const res2 = await postJson(POST as unknown as (req: Request) => Promise<Response>, {
      ticker: "7203",
      moveContext: "+4.2% on 2x volume",
    });
    const json2 = (await res2.json()) as { cached: boolean };
    expect(json2.cached).toBe(true);
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it("returns 503 when OPENROUTER_API_KEY is missing", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const { POST } = await import("@/app/api/deep/why-moved/route");
    const res = await postJson(POST as unknown as (req: Request) => Promise<Response>, {
      ticker: "7203",
      moveContext: "+1%",
    });
    expect(res.status).toBe(503);
  });

  it("rejects bad payloads", async () => {
    const { POST } = await import("@/app/api/deep/why-moved/route");
    const res = await postJson(POST as unknown as (req: Request) => Promise<Response>, {});
    expect(res.status).toBe(400);
  });
});
