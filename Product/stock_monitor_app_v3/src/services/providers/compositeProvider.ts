import { Stock } from "@/types/stock";

import { EdinetDbProvider } from "./edinetDbProvider";
import { JQuantsPriceProvider } from "./jquantsPriceProvider";
import { MockProvider } from "./mockProvider";
import {
  DataMode,
  Fundamentals,
  ProviderErrorCode,
  ProviderHealth,
  Quote,
  StockFetchResult
} from "./types";
import { YahooFinancePriceProvider } from "./yahooFinancePriceProvider";

function classifyProviderError(message: string): ProviderErrorCode {
  const lower = message.toLowerCase();
  if (lower.includes("api key missing") || lower.includes("credentials") || lower.includes("unauthorized") || lower.includes("forbidden")) {
    return "auth_failure";
  }
  if (lower.includes("rate limit") || lower.includes("429") || lower.includes("too many")) {
    return "rate_limit";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "timeout";
  }
  return "network";
}

function buildFallbackStock(
  code: string,
  quote: Quote | undefined,
  fundamental: Fundamentals | undefined
): Stock {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const fallbackPrice = quote?.price ?? 0;
  const fallbackBenchmark = 100;
  return {
    id: `live-${code}`,
    code,
    name: quote?.name?.trim() ? quote.name : `銘柄 ${code}`,
    sector: quote?.sector ?? fundamental?.sector ?? "未分類",
    themeTags: [],
    price: fallbackPrice,
    changePercent: quote?.changePercent ?? 0,
    marketCap: quote?.marketCap ?? fundamental?.marketCap ?? 0,
    per: quote?.per ?? fundamental?.per ?? null,
    pbr: quote?.pbr ?? fundamental?.pbr ?? null,
    dividendYield: quote?.dividendYield ?? fundamental?.dividendYield ?? null,
    revenueGrowth: fundamental?.revenueGrowth ?? null,
    opGrowth: fundamental?.opGrowth ?? null,
    operatingCF: fundamental?.operatingCF ?? null,
    manualAction: null,
    hasDilutionRisk: false,
    hasOneOffProfitRisk: false,
    oneLiner: "API検索から追加された銘柄です。",
    summary: "企業説明は未登録です。必要に応じてメモで補足してください。",
    coreKpiLabel: "次回確認",
    coreKpiValue: "-",
    riskSignal: "決算・CF・成長率の更新を確認してください。",
    collapseCondition: "売上成長と営業CFの悪化が継続する場合",
    priceUpdatedAt: quote?.sourceTimestamp ?? null,
    fundamentalsUpdatedAt: fundamental?.sourceTimestamp ?? null,
    fundamentalsSubmitDate: fundamental?.sourceTimestamp ?? null,
    watched: false,
    chartData:
      fallbackPrice > 0
        ? [
            {
              date: month,
              price: fallbackPrice,
              benchmark: fallbackBenchmark
            }
          ]
        : []
  };
}

function mergeStocks(
  requestCodes: string[],
  mockStocks: Stock[],
  quotes: Quote[],
  fundamentals: Fundamentals[]
): Stock[] {
  const quoteMap = new Map(quotes.map((quote) => [quote.code, quote]));
  const fundamentalsMap = new Map(fundamentals.map((fundamental) => [fundamental.code, fundamental]));

  const merged: Stock[] = mockStocks.map((stock) => {
    const quote = quoteMap.get(stock.code);
    const fundamental = fundamentalsMap.get(stock.code);

    return {
      ...stock,
      name: quote?.name ?? stock.name,
      price: quote?.price ?? stock.price,
      changePercent: quote?.changePercent ?? stock.changePercent,
      sector: quote?.sector ?? fundamental?.sector ?? stock.sector,
      marketCap: quote?.marketCap ?? fundamental?.marketCap ?? stock.marketCap,
      per: quote?.per ?? fundamental?.per ?? stock.per,
      pbr: quote?.pbr ?? fundamental?.pbr ?? stock.pbr,
      dividendYield: quote?.dividendYield ?? fundamental?.dividendYield ?? stock.dividendYield,
      revenueGrowth: fundamental?.revenueGrowth ?? stock.revenueGrowth,
      opGrowth: fundamental?.opGrowth ?? stock.opGrowth,
      operatingCF: fundamental?.operatingCF ?? stock.operatingCF,
      priceUpdatedAt: quote?.sourceTimestamp ?? stock.priceUpdatedAt ?? null,
      fundamentalsUpdatedAt: fundamental?.sourceTimestamp ?? stock.fundamentalsUpdatedAt ?? null,
      fundamentalsSubmitDate: fundamental?.sourceTimestamp ?? stock.fundamentalsSubmitDate ?? null,
      // TODO(Phase 3): switch chartData to live time-series endpoint.
      chartData: stock.chartData
    };
  });

  const existingCodes = new Set(merged.map((stock) => stock.code));
  for (const code of requestCodes) {
    if (existingCodes.has(code)) {
      continue;
    }
    merged.push(buildFallbackStock(code, quoteMap.get(code), fundamentalsMap.get(code)));
  }

  return merged;
}

function quoteHasMinimumFields(quote: Quote | undefined): boolean {
  return Boolean(quote && quote.price !== null && quote.changePercent !== null);
}

function buildErrorMessage(parts: string[]): string | null {
  const cleaned = parts.map((part) => part.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.join(" / ") : null;
}

function latestTimestamp(values: Array<string | null | undefined>): string | null {
  let latestMs = Number.NaN;
  let fallbackRaw: string | null = null;

  for (const value of values) {
    if (!value || !value.trim()) {
      continue;
    }
    if (!fallbackRaw) {
      fallbackRaw = value.trim();
    }
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed) && (Number.isNaN(latestMs) || parsed > latestMs)) {
      latestMs = parsed;
    }
  }

  if (!Number.isNaN(latestMs)) {
    return new Date(latestMs).toISOString();
  }
  return fallbackRaw;
}

function fallbackReasonByState(
  quoteOk: boolean,
  fundamentalsOk: boolean,
  missingMinimumCodes: string[]
): string | null {
  if (!quoteOk && !fundamentalsOk) {
    return "価格データと財務データの取得に失敗したため、mock データを表示しています。";
  }
  if (!quoteOk && fundamentalsOk) {
    return "価格データ取得に失敗したため、財務と mock を組み合わせて表示しています。";
  }
  if (quoteOk && !fundamentalsOk) {
    return "財務データ取得に失敗したため、価格と mock を組み合わせて表示しています。";
  }
  if (missingMinimumCodes.length > 0) {
    return `一部銘柄の価格必須項目が不足したため補助データで表示しています（${missingMinimumCodes.join(", ")}）。`;
  }
  return null;
}

export class CompositeProvider {
  private readonly mockProvider = new MockProvider();
  private readonly quoteProvider = new JQuantsPriceProvider();
  private readonly fallbackQuoteProvider = new YahooFinancePriceProvider();
  private readonly fundamentalsProvider = new EdinetDbProvider(process.env.EDINET_DB_API_KEY ?? null);

  async load(codes: string[]): Promise<StockFetchResult> {
    const mockStocks = await this.mockProvider.getStocks(codes);
    // Canonical: server env (DATA_MODE / ENABLE_LIVE_DATA).
    // NEXT_PUBLIC_* is kept only as backward-compatible fallback.
    const modeEnv = (process.env.DATA_MODE ?? process.env.NEXT_PUBLIC_DATA_MODE ?? "mock").toLowerCase();
    const liveEnabledRaw = (process.env.ENABLE_LIVE_DATA ?? process.env.NEXT_PUBLIC_ENABLE_LIVE_DATA ?? "false")
      .toLowerCase()
      .trim();
    const liveEnabled = liveEnabledRaw === "true" || liveEnabledRaw === "1" || liveEnabledRaw === "yes";
    const fetchedAt = new Date().toISOString();

    if (!liveEnabled || modeEnv !== "live") {
      return {
        stocks: mockStocks,
        dataMode: "mock",
        lastUpdatedAt: fetchedAt,
        error: null,
        fallbackReason: "環境変数で live mode が無効のため mock データを表示しています。",
        health: [
          {
            provider: "jquants",
            ok: false,
            message: "live mode disabled",
            errorCode: null,
            latencyMs: null,
            fetchedAt,
            sourceTimestamp: null,
            sourceLabel: null
          },
          {
            provider: "edinetDb",
            ok: false,
            message: "live mode disabled",
            errorCode: null,
            latencyMs: null,
            fetchedAt,
            sourceTimestamp: null,
            sourceLabel: null
          }
        ]
      };
    }

    let quotes: Quote[] = [];
    let fundamentals: Fundamentals[] = [];
    const health: ProviderHealth[] = [];
    const errors: string[] = [];

    let quoteOk = false;
    let fundamentalsOk = false;

    const jquantsStart = Date.now();
    try {
      quotes = await this.quoteProvider.getQuotes(codes);
      quoteOk = true;
      health.push({
        provider: "jquants",
        ok: true,
        message: null,
        errorCode: null,
        latencyMs: Date.now() - jquantsStart,
        fetchedAt: new Date().toISOString(),
        sourceTimestamp: latestTimestamp(quotes.map((quote) => quote.sourceTimestamp)),
        sourceLabel: "J-Quants /v2/equities/bars/daily"
      });
    } catch (error) {
      quoteOk = false;
      const message = error instanceof Error ? error.message : "J-Quants request failed.";
      errors.push(`J-Quants: ${message}`);
      health.push({
        provider: "jquants",
        ok: false,
        message,
        errorCode: classifyProviderError(message),
        latencyMs: Date.now() - jquantsStart,
        fetchedAt: new Date().toISOString(),
        sourceTimestamp: null,
        sourceLabel: null
      });
    }

    // Partial fallback: only use Yahoo for codes that J-Quants didn't return
    const jquantsSucceededCodes = new Set(quotes.map((q) => q.code));
    const missingFromJquants = codes.filter((code) => !jquantsSucceededCodes.has(code));

    if (missingFromJquants.length > 0) {
      const yahooStart = Date.now();
      try {
        const fallbackQuotes = await this.fallbackQuoteProvider.getQuotes(missingFromJquants);
        quotes = [...quotes, ...fallbackQuotes];
        if (!quoteOk && fallbackQuotes.length > 0) {
          quoteOk = true;
        }
        health.push({
          provider: "yahoo",
          ok: true,
          message: quoteOk ? "partial fallback" : "J-Quants fallback",
          errorCode: null,
          latencyMs: Date.now() - yahooStart,
          fetchedAt: new Date().toISOString(),
          sourceTimestamp: latestTimestamp(fallbackQuotes.map((q) => q.sourceTimestamp)),
          sourceLabel: "Yahoo Finance / Stooq (fallback)"
        });
      } catch (fallbackError) {
        const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : "Yahoo/Stooq fallback failed.";
        errors.push(`Yahoo/Stooq: ${fallbackMsg}`);
        health.push({
          provider: "yahoo",
          ok: false,
          message: fallbackMsg,
          errorCode: classifyProviderError(fallbackMsg),
          latencyMs: Date.now() - yahooStart,
          fetchedAt: new Date().toISOString(),
          sourceTimestamp: null,
          sourceLabel: null
        });
      }
    }

    const edinetStart = Date.now();
    try {
      fundamentals = await this.fundamentalsProvider.getFundamentals(codes);
      fundamentalsOk = true;
      health.push({
        provider: "edinetDb",
        ok: true,
        message: null,
        errorCode: null,
        latencyMs: Date.now() - edinetStart,
        fetchedAt: new Date().toISOString(),
        sourceTimestamp: latestTimestamp(fundamentals.map((item) => item.sourceTimestamp)),
        sourceLabel:
          fundamentals.find((item) => Boolean(item.sourceLabel))?.sourceLabel ?? "submit_date / fiscal_year"
      });
    } catch (error) {
      fundamentalsOk = false;
      const message = error instanceof Error ? error.message : "EDINET DB request failed.";
      errors.push(`EDINET DB: ${message}`);
      health.push({
        provider: "edinetDb",
        ok: false,
        message,
        errorCode: classifyProviderError(message),
        latencyMs: Date.now() - edinetStart,
        fetchedAt: new Date().toISOString(),
        sourceTimestamp: null,
        sourceLabel: null
      });
    }

    if (!quoteOk && !fundamentalsOk) {
      return {
        stocks: mockStocks,
        dataMode: "mock",
        lastUpdatedAt: fetchedAt,
        error: buildErrorMessage(errors),
        fallbackReason: fallbackReasonByState(quoteOk, fundamentalsOk, []),
        health
      };
    }

    const mergedStocks = mergeStocks(codes, mockStocks, quotes, fundamentals);
    const quoteMap = new Map(quotes.map((quote) => [quote.code, quote]));
    const missingMinimum = codes.filter((code) => !quoteHasMinimumFields(quoteMap.get(code)));

    let dataMode: DataMode = "fallback";
    if (quoteOk && fundamentalsOk && missingMinimum.length === 0) {
      dataMode = "live";
    }

    const missingMessage =
      missingMinimum.length > 0
        ? `minimum quote fields missing: ${missingMinimum.join(", ")}`
        : "";
    const fallbackReason = fallbackReasonByState(quoteOk, fundamentalsOk, missingMinimum);

    return {
      stocks: mergedStocks,
      dataMode,
      lastUpdatedAt: fetchedAt,
      error: dataMode === "live" ? null : buildErrorMessage([...errors, missingMessage]),
      fallbackReason: dataMode === "live" ? null : fallbackReason,
      health
    };
  }
}

export async function loadStocksWithProviders(codes: string[]): Promise<StockFetchResult> {
  const provider = new CompositeProvider();
  return provider.load(codes);
}
