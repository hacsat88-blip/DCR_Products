import { Stock } from "@/types/stock";
import { mergeStock } from "@/lib/mergeStock";
import { SourceLabel, StockSourceMeta, normalizeSourceLabel, resolveSourceLabel } from "@/types/source";

import { AlphaVantagePriceProvider } from "./alphaVantagePriceProvider";
import { EdinetDbProvider } from "./edinetDbProvider";
import { buildFallbackStockNarrative } from "./fallbackStockNarrative";
import { MockProvider } from "./mockProvider";
import {
  buildErrorMessage,
  buildLiveModeDisabledHealth,
  classifyProviderError,
  createProviderHealthRecord,
  latestTimestamp,
  quoteHasMinimumFields,
  resolveFallbackPolicy,
  resolveOverallSourceLabel
} from "./providerFallbackPolicy";
import {
  Fundamentals,
  ProviderFallbackOrder,
  ProviderHealth,
  Quote,
  StockFetchResult
} from "./types";
import { YahooFinancePriceProvider } from "./yahooFinancePriceProvider";

function buildFallbackStock(code: string, quote: Quote | undefined, fundamental: Fundamentals | undefined): Stock {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const fallbackPrice = quote?.price ?? 0;
  const fallbackBenchmark = 100;
  const narrative = buildFallbackStockNarrative(code, quote, fundamental);
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
    oneLiner: narrative.oneLiner,
    summary: narrative.summary,
    coreKpiLabel: narrative.coreKpiLabel,
    coreKpiValue: narrative.coreKpiValue,
    riskSignal: narrative.riskSignal,
    collapseCondition: narrative.collapseCondition,
    priceUpdatedAt: quote?.sourceTimestamp ?? null,
    priceSourceLabel: normalizeSourceLabel(quote?.sourceLabel, "M"),
    fundamentalsUpdatedAt: fundamental?.sourceTimestamp ?? null,
    fundamentalsSubmitDate: fundamental?.sourceTimestamp ?? null,
    fundamentalsSourceLabel: fundamental ? normalizeSourceLabel(fundamental.sourceLabel, "C") : "M",
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

function mergeStocks(requestCodes: string[], mockStocks: Stock[], quotes: Quote[], fundamentals: Fundamentals[]): Stock[] {
  const quoteMap = new Map(quotes.map((quote) => [quote.code, quote]));
  const fundamentalsMap = new Map(fundamentals.map((fundamental) => [fundamental.code, fundamental]));

  const merged: Stock[] = mockStocks.map((stock) => mergeStock(stock, quoteMap.get(stock.code), fundamentalsMap.get(stock.code)));

  const existingCodes = new Set(merged.map((stock) => stock.code));
  for (const code of requestCodes) {
    if (existingCodes.has(code)) {
      continue;
    }
    merged.push(buildFallbackStock(code, quoteMap.get(code), fundamentalsMap.get(code)));
  }

  return merged;
}

function buildSourceMeta(stocks: Stock[], overallOverride?: SourceLabel): StockSourceMeta {
  const price = resolveSourceLabel(stocks.map((stock) => stock.priceSourceLabel ?? null));
  const fundamentals = resolveSourceLabel(stocks.map((stock) => stock.fundamentalsSourceLabel ?? null));
  return {
    overall: overallOverride ?? resolveSourceLabel([price, fundamentals]),
    price,
    fundamentals
  };
}

function withMockSourceLabels(stocks: Stock[]): Stock[] {
  return stocks.map((stock) => ({
    ...stock,
    priceSourceLabel: stock.priceSourceLabel ?? "M",
    fundamentalsSourceLabel: stock.fundamentalsSourceLabel ?? "M"
  }));
}

const DEFAULT_PROVIDER_ORDER: ProviderFallbackOrder = {
  quotes: ["yahoo", "alphaVantage", "mock"],
  fundamentals: ["edinetDb", "mock"]
};

export interface LoadStocksOptions {
  phase?: "price" | "full";
}

export class CompositeProvider {
  private readonly mockProvider = new MockProvider();
  private readonly primaryQuoteProvider = new YahooFinancePriceProvider();
  private readonly fallbackQuoteProvider = new AlphaVantagePriceProvider(process.env.ALPHA_VANTAGE_API_KEY ?? null);
  private readonly fundamentalsProvider = new EdinetDbProvider(process.env.EDINET_DB_API_KEY ?? null);

  private getAlphaVantageCumulativeCalls(): number {
    const provider = this.fallbackQuoteProvider as {
      getCumulativeCallCount?: () => number;
    };
    const value = provider.getCumulativeCallCount?.();
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
  }

  async load(codes: string[], options: LoadStocksOptions = {}): Promise<StockFetchResult> {
    const mockStocks = await this.mockProvider.getStocks(codes);
    const phase = options.phase ?? "full";
    const fundamentalsDeferred = phase === "price";
    const modeEnv = (process.env.DATA_MODE ?? process.env.NEXT_PUBLIC_DATA_MODE ?? "mock").toLowerCase();
    const liveEnabledRaw = (process.env.ENABLE_LIVE_DATA ?? process.env.NEXT_PUBLIC_ENABLE_LIVE_DATA ?? "false")
      .toLowerCase()
      .trim();
    const liveEnabled = liveEnabledRaw === "true" || liveEnabledRaw === "1" || liveEnabledRaw === "yes";
    const fetchedAt = new Date().toISOString();

    if (!liveEnabled || modeEnv !== "live") {
      const stocks = withMockSourceLabels(mockStocks);
      return {
        stocks,
        dataMode: "mock",
        sourceLabel: "M",
        sourceMeta: buildSourceMeta(stocks, "M"),
        providerOrder: DEFAULT_PROVIDER_ORDER,
        lastUpdatedAt: fetchedAt,
        error: null,
        fallbackReason: "環境変数で live mode が無効のため mock データを表示しています。",
        health: buildLiveModeDisabledHealth(fetchedAt)
      };
    }

    let quotes: Quote[] = [];
    let fundamentals: Fundamentals[] = [];
    const health: ProviderHealth[] = [];
    const errors: string[] = [];
    let quoteOk = false;
    let fundamentalsOk = false;

    const yahooStart = Date.now();
    try {
      quotes = await this.primaryQuoteProvider.getQuotes(codes);
      quoteOk = true;
      health.push(createProviderHealthRecord({
        provider: "yahoo",
        ok: true,
        message: null,
        decision: "used",
        errorCode: null,
        latencyMs: Date.now() - yahooStart,
        fetchedAt: new Date().toISOString(),
        sourceTimestamp: latestTimestamp(quotes.map((quote) => quote.sourceTimestamp)),
        sourceLabel: "YF"
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Yahoo request failed.";
      errors.push(`Yahoo: ${message}`);
      health.push(createProviderHealthRecord({
        provider: "yahoo",
        ok: false,
        message,
        decision: "failed",
        errorCode: classifyProviderError(message),
        latencyMs: Date.now() - yahooStart,
        fetchedAt: new Date().toISOString(),
        sourceTimestamp: null,
        sourceLabel: null
      }));
    }

    const yahooSucceededCodes = new Set(quotes.map((q) => q.code));
    const missingFromYahoo = codes.filter((code) => !yahooSucceededCodes.has(code));
    if (missingFromYahoo.length > 0) {
      const alphaStart = Date.now();
      try {
        const fallbackQuotes = await this.fallbackQuoteProvider.getQuotes(missingFromYahoo);
        quotes = [...quotes, ...fallbackQuotes];
        if (fallbackQuotes.length > 0) {
          quoteOk = true;
        }
        health.push(createProviderHealthRecord({
          provider: "alphaVantage",
          ok: true,
          message: "fallback used",
          decision: "used",
          errorCode: null,
          latencyMs: Date.now() - alphaStart,
          fetchedAt: new Date().toISOString(),
          sourceTimestamp: latestTimestamp(fallbackQuotes.map((q) => q.sourceTimestamp)),
          sourceLabel: "AV",
          cumulativeCalls: this.getAlphaVantageCumulativeCalls()
        }));
      } catch (fallbackError) {
        const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : "Alpha Vantage fallback failed.";
        errors.push(`Alpha Vantage: ${fallbackMsg}`);
        health.push(createProviderHealthRecord({
          provider: "alphaVantage",
          ok: false,
          message: fallbackMsg,
          decision: "failed",
          errorCode: classifyProviderError(fallbackMsg),
          latencyMs: Date.now() - alphaStart,
          fetchedAt: new Date().toISOString(),
          sourceTimestamp: null,
          sourceLabel: null,
          cumulativeCalls: this.getAlphaVantageCumulativeCalls()
        }));
      }
    } else {
      health.push(createProviderHealthRecord({
        provider: "alphaVantage",
        ok: true,
        message: "fallback not required",
        decision: "not_required",
        errorCode: null,
        latencyMs: 0,
        fetchedAt: new Date().toISOString(),
        sourceTimestamp: null,
        sourceLabel: "AV",
        cumulativeCalls: this.getAlphaVantageCumulativeCalls()
      }));
    }

    if (fundamentalsDeferred) {
      fundamentalsOk = true;
      health.push(createProviderHealthRecord({
        provider: "edinetDb",
        ok: true,
        message: "deferred to phase2",
        decision: "deferred",
        errorCode: null,
        latencyMs: 0,
        fetchedAt: new Date().toISOString(),
        sourceTimestamp: null,
        sourceLabel: null
      }));
    } else {
      const edinetStart = Date.now();
      try {
        fundamentals = await this.fundamentalsProvider.getFundamentals(codes);
        fundamentalsOk = true;
        health.push(createProviderHealthRecord({
          provider: "edinetDb",
          ok: true,
          message: null,
          decision: "used",
          errorCode: null,
          latencyMs: Date.now() - edinetStart,
          fetchedAt: new Date().toISOString(),
          sourceTimestamp: latestTimestamp(fundamentals.map((item) => item.sourceTimestamp)),
          sourceLabel: "C"
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : "EDINET DB request failed.";
        errors.push(`EDINET DB: ${message}`);
        health.push(createProviderHealthRecord({
          provider: "edinetDb",
          ok: false,
          message,
          decision: "failed",
          errorCode: classifyProviderError(message),
          latencyMs: Date.now() - edinetStart,
          fetchedAt: new Date().toISOString(),
          sourceTimestamp: null,
          sourceLabel: null
        }));
      }
    }

    if (!quoteOk && !fundamentalsOk) {
      const stocks = withMockSourceLabels(mockStocks);
      return {
        stocks,
        dataMode: "mock",
        sourceLabel: "M",
        sourceMeta: buildSourceMeta(stocks, "M"),
        providerOrder: DEFAULT_PROVIDER_ORDER,
        lastUpdatedAt: fetchedAt,
        error: buildErrorMessage(errors),
        fallbackReason: resolveFallbackPolicy({
          quoteOk,
          fundamentalsOk,
          fundamentalsDeferred,
          missingMinimumCodes: []
        }).fallbackReason,
        health
      };
    }

    const mergedStocks = mergeStocks(codes, mockStocks, quotes, fundamentals);
    const quoteMap = new Map(quotes.map((quote) => [quote.code, quote]));
    const missingMinimum = codes.filter((code) => !quoteHasMinimumFields(quoteMap.get(code)));
    const policy = resolveFallbackPolicy({
      quoteOk,
      fundamentalsOk,
      fundamentalsDeferred,
      missingMinimumCodes: missingMinimum
    });
    const sourceLabel = resolveOverallSourceLabel(policy.dataMode, quotes);

    return {
      stocks: mergedStocks,
      dataMode: policy.dataMode,
      sourceLabel,
      sourceMeta: buildSourceMeta(mergedStocks, sourceLabel),
      providerOrder: DEFAULT_PROVIDER_ORDER,
      lastUpdatedAt: fetchedAt,
      error: policy.dataMode === "live" ? null : buildErrorMessage([...errors, policy.missingMinimumMessage ?? ""]),
      fallbackReason: policy.dataMode === "live" ? null : policy.fallbackReason,
      health
    };
  }
}

export async function loadStocksWithProviders(
  codes: string[],
  options: LoadStocksOptions = {}
): Promise<StockFetchResult> {
  const provider = new CompositeProvider();
  return provider.load(codes, options);
}
