import { describe, it, expect, vi } from "vitest";
import {
  analyzeStock,
  summarizeNews,
  extractIntent,
  detectMarketAnomaly,
  chatWithHistory,
} from "../router";
import {
  IntentSchema,
  MarketAnomalySchema,
  NewsSummarySchema,
  StockAnalysisSchema,
} from "../schemas";

function jsonResponse(payload: unknown) {
  const body = {
    choices: [{ message: { content: JSON.stringify(payload) } }],
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
function textResponse(text: string) {
  const body = { choices: [{ message: { content: text } }] };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const callOpts = {
  apiKey: "sk-test",
  sleepImpl: () => Promise.resolve(),
};

describe("router", () => {
  it("analyzeStock parses StockAnalysisSchema", async () => {
    const sample = {
      code: "7203",
      name: "トヨタ自動車",
      scores: { a: 70, b: 65, c: 60, d: 80, e: 55 },
      totalScore: 67,
      scenarios: {
        short: { up: "+5%（推定）", mid: "0%（推定）", down: "-5%（推定）", confidence: "mid", evidence: "B" },
        mid: { up: "+10%（推定）", mid: "+2%（推定）", down: "-8%（推定）", confidence: "mid", evidence: "B" },
        long: { up: "+25%（仮説）", mid: "+5%（推定）", down: "-15%（仮説）", confidence: "low", evidence: "C" },
      },
      risks: ["為替変動"],
      catalysts: ["EV販売拡大"],
      unknowns: ["最新四半期決算"],
    };
    const fetchImpl = vi.fn(async () => jsonResponse(sample));
    const result = await analyzeStock(
      { code: "7203", name: "トヨタ自動車" },
      { ...callOpts, fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(StockAnalysisSchema.safeParse(result).success).toBe(true);
    expect(result.code).toBe("7203");
  });

  it("summarizeNews parses NewsSummarySchema", async () => {
    const sample = {
      items: [
        {
          title: "日経反発",
          summary: "前日比上昇で取引終了。半導体関連が押し上げ（推定）。",
          sentiment: "positive",
          sectors: ["半導体"],
        },
        {
          title: "円安進行",
          summary: "対ドルで円安が進む。輸出関連に追い風（推定）。",
          sentiment: "neutral",
          sectors: ["自動車", "電機"],
        },
      ],
    };
    const fetchImpl = vi.fn(async () => jsonResponse(sample));
    const result = await summarizeNews(
      [{ title: "日経反発" }, { title: "円安進行" }],
      { ...callOpts, fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(NewsSummarySchema.safeParse(result).success).toBe(true);
    expect(result.items).toHaveLength(2);
  });

  it("extractIntent parses IntentSchema", async () => {
    const sample = {
      market: "JP",
      priceRangeMin: 100,
      priceRangeMax: 299,
      currency: "JPY",
      theme: "半導体",
      style: "中期テーマ",
      riskTolerance: "mid",
    };
    const fetchImpl = vi.fn(async () => jsonResponse(sample));
    const result = await extractIntent(
      "100〜200円台の半導体テーマ銘柄を中期で",
      { ...callOpts, fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(IntentSchema.safeParse(result).success).toBe(true);
    expect(result.priceRangeMax).toBe(299);
  });

  it("detectMarketAnomaly parses MarketAnomalySchema", async () => {
    const sample = {
      signal: "🟡",
      level: "caution",
      reasons: ["VIX上昇", "金利上昇"],
      recommendedAction: "短期シナリオの下振れ幅を広めに置く",
    };
    const fetchImpl = vi.fn(async () => jsonResponse(sample));
    const result = await detectMarketAnomaly(
      { vix: 22, notes: "FOMC前" },
      { ...callOpts, fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(MarketAnomalySchema.safeParse(result).success).toBe(true);
    expect(result.signal).toBe("🟡");
  });

  it("chatWithHistory returns string content", async () => {
    const fetchImpl = vi.fn(async () => textResponse("ご質問ありがとうございます（推定）。"));
    const result = await chatWithHistory(
      [{ role: "user", content: "TOPIX について教えて" }],
      { ...callOpts, fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    expect(typeof result).toBe("string");
    expect(result).toContain("推定");
  });

  it("chatWithHistory uses fast model with system + history messages", async () => {
    const fetchImpl = vi.fn(async () => textResponse("ok"));
    await chatWithHistory(
      [
        { role: "user", content: "Q1" },
        { role: "assistant", content: "A1" },
        { role: "user", content: "Q2" },
      ],
      { ...callOpts, fetchImpl: fetchImpl as unknown as typeof fetch },
    );
    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1];
    const body = JSON.parse(init.body as string);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages).toHaveLength(4);
  });
});
