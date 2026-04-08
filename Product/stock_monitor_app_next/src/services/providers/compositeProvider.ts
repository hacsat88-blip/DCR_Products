import { Stock } from "@/types/stock";
import { mergeStock } from "@/lib/mergeStock";
import { SourceLabel, StockSourceMeta, resolveSourceLabel } from "@/types/source";

import { AlphaVantagePriceProvider } from "./alphaVantagePriceProvider";
import { EdinetDbProvider } from "./edinetDbProvider";
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

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatDecimal(value: number, digits = 1): string {
  return value
    .toFixed(digits)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*[1-9])0+$/, "$1");
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatDecimal(value)}%`;
}

function formatPercent(value: number): string {
  return `${formatDecimal(value)}%`;
}

function resolveCoreKpiValue(data: {
  changePercent: number | null | undefined;
  revenueGrowth: number | null | undefined;
  opGrowth: number | null | undefined;
  operatingCF: number | null | undefined;
  dividendYield: number | null | undefined;
  per: number | null | undefined;
  pbr: number | null | undefined;
}): { label: string; value: string } {
  if (isFiniteNumber(data.revenueGrowth)) {
    return { label: "売上成長率", value: formatSignedPercent(data.revenueGrowth) };
  }
  if (isFiniteNumber(data.opGrowth)) {
    return { label: "営業益成長率", value: formatSignedPercent(data.opGrowth) };
  }
  if (isFiniteNumber(data.operatingCF)) {
    return { label: "営業CF", value: data.operatingCF.toLocaleString("ja-JP") };
  }
  if (isFiniteNumber(data.dividendYield)) {
    return { label: "配当利回り", value: formatPercent(data.dividendYield) };
  }
  if (isFiniteNumber(data.per)) {
    return { label: "PER", value: `${formatDecimal(data.per)}倍` };
  }
  if (isFiniteNumber(data.pbr)) {
    return { label: "PBR", value: `${formatDecimal(data.pbr)}倍` };
  }
  if (isFiniteNumber(data.changePercent)) {
    return { label: "当日騰落率", value: formatSignedPercent(data.changePercent) };
  }
  return { label: "確認優先指標", value: "財務更新待ち" };
}

function buildFallbackNarrative(code: string, quote: Quote | undefined, fundamental: Fundamentals | undefined): {
  oneLiner: string;
  summary: string;
  coreKpiLabel: string;
  coreKpiValue: string;
  riskSignal: string;
  collapseCondition: string;
} {
  const sector = quote?.sector ?? fundamental?.sector ?? "未分類";
  const changePercent = quote?.changePercent;
  const per = quote?.per ?? fundamental?.per;
  const pbr = quote?.pbr ?? fundamental?.pbr;
  const dividendYield = quote?.dividendYield ?? fundamental?.dividendYield;
  const revenueGrowth = fundamental?.revenueGrowth;
  const opGrowth = fundamental?.opGrowth;
  const operatingCF = fundamental?.operatingCF;

  const oneLiner = isFiniteNumber(changePercent)
    ? `${sector}セクターの${code}は${formatSignedPercent(changePercent)}。短期の値動きを観測しながら初期監視します。`
    : `${sector}セクターの${code}。値動きデータは取得待ちのため、まずは財務更新を優先して追跡します。`;

  const valuationSignals: string[] = [];
  if (isFiniteNumber(per)) {
    valuationSignals.push(`PER ${formatDecimal(per)}倍`);
  }
  if (isFiniteNumber(pbr)) {
    valuationSignals.push(`PBR ${formatDecimal(pbr)}倍`);
  }
  if (isFiniteNumber(dividendYield)) {
    valuationSignals.push(`配当利回り ${formatPercent(dividendYield)}`);
  }
  const valuationSummary =
    valuationSignals.length > 0
      ? `バリュエーションは${valuationSignals.join(" / ")}。`
      : "PER・PBR・配当利回りは取得待ちです。";

  const growthSignals: string[] = [];
  if (isFiniteNumber(revenueGrowth)) {
    growthSignals.push(`売上成長率 ${formatSignedPercent(revenueGrowth)}`);
  }
  if (isFiniteNumber(opGrowth)) {
    growthSignals.push(`営業益成長率 ${formatSignedPercent(opGrowth)}`);
  }
  if (isFiniteNumber(operatingCF)) {
    growthSignals.push(`営業CF ${operatingCF.toLocaleString("ja-JP")}`);
  }
  const growthSummary =
    growthSignals.length > 0
      ? `財務では${growthSignals.join(" / ")}を確認できます。`
      : "成長率と営業CFは次回の開示更新を確認してください。";

  const coreKpi = resolveCoreKpiValue({
    changePercent,
    revenueGrowth,
    opGrowth,
    operatingCF,
    dividendYield,
    per,
    pbr
  });

  const riskSignals: string[] = [];
  if (isFiniteNumber(per) && per >= 40) {
    riskSignals.push("PERが高く、決算の下振れ時にバリュエーション調整が出やすい");
  }
  if (isFiniteNumber(pbr) && pbr >= 4) {
    riskSignals.push("PBRが高めで、金利上昇局面の評価圧縮に注意");
  }
  if (isFiniteNumber(changePercent) && Math.abs(changePercent) >= 5) {
    riskSignals.push(`日次変動が${formatSignedPercent(changePercent)}と大きく、短期ボラティリティが高い`);
  }
  if (!isFiniteNumber(revenueGrowth) || !isFiniteNumber(operatingCF)) {
    riskSignals.push("成長率または営業CFが欠けているため、次回決算の補完が必要");
  }
  const riskSignal =
    riskSignals.length > 0 ? `${riskSignals.join("。")}。` : "業績更新と需給の変化をセットで確認してください。";

  const collapseCondition = isFiniteNumber(revenueGrowth) && isFiniteNumber(operatingCF)
    ? "売上成長率がマイナス圏に入り、営業CFも2四半期連続で悪化した場合"
    : isFiniteNumber(revenueGrowth)
      ? "売上成長率が2四半期連続で鈍化した場合"
      : isFiniteNumber(opGrowth)
        ? "営業益成長率がマイナス圏で定着した場合"
        : isFiniteNumber(operatingCF)
          ? "営業CFが2四半期連続でマイナス化した場合"
          : "次回決算でも成長率と営業CFの両方が確認できない場合";

  return {
    oneLiner,
    summary: `${sector}の追加監視銘柄です。${valuationSummary}${growthSummary}`,
    coreKpiLabel: coreKpi.label,
    coreKpiValue: coreKpi.value,
    riskSignal,
    collapseCondition
  };
}

function classifyProviderError(message: string): ProviderErrorCode {
  const lower = message.toLowerCase();
  if (
    lower.includes("api key missing") ||
    lower.includes("credentials") ||
    lower.includes("unauthorized") ||
    lower.includes("forbidden")
  ) {
    return "auth_failure";
  }
  if (lower.includes("rate limit") || lower.includes("429") || lower.includes("too many")) {
    return "rate_limit";
  }
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "timeout";
  }
  if (lower.includes("parse") || lower.includes("json")) {
    return "parse_error";
  }
  return "network";
}

function buildFallbackStock(code: string, quote: Quote | undefined, fundamental: Fundamentals | undefined): Stock {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const fallbackPrice = quote?.price ?? 0;
  const fallbackBenchmark = 100;
  const narrative = buildFallbackNarrative(code, quote, fundamental);
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
    priceSourceLabel: quote?.sourceLabel ?? "M",
    fundamentalsUpdatedAt: fundamental?.sourceTimestamp ?? null,
    fundamentalsSubmitDate: fundamental?.sourceTimestamp ?? null,
    fundamentalsSourceLabel: fundamental ? "C" : "M",
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

function fallbackReasonByState(quoteOk: boolean, fundamentalsOk: boolean, missingMinimumCodes: string[]): string | null {
  if (!quoteOk && !fundamentalsOk) {
    return "価格データと財務データの取得に失敗したため、mock データを表示しています。";
  }
  if (!quoteOk && fundamentalsOk) {
    return "Yahoo/Alpha Vantage の価格データ取得に失敗したため、財務と mock を組み合わせて表示しています。";
  }
  if (quoteOk && !fundamentalsOk) {
    return "財務データ取得に失敗したため、価格と mock を組み合わせて表示しています。";
  }
  if (missingMinimumCodes.length > 0) {
    return `一部銘柄の価格必須項目が不足したため補助データで表示しています（${missingMinimumCodes.join(", ")}）。`;
  }
  return null;
}

function resolveOverallSourceLabel(dataMode: DataMode, quotes: Quote[]): SourceLabel {
  if (dataMode === "mock") {
    return "M";
  }
  return resolveSourceLabel(quotes.map((quote) => quote.sourceLabel ?? null));
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
        lastUpdatedAt: fetchedAt,
        error: null,
        fallbackReason: "環境変数で live mode が無効のため mock データを表示しています。",
        health: [
          {
            provider: "yahoo",
            ok: false,
            message: "live mode disabled",
            errorCode: null,
            latencyMs: null,
            fetchedAt,
            sourceTimestamp: null,
            sourceLabel: "M"
          },
          {
            provider: "alphaVantage",
            ok: false,
            message: "live mode disabled",
            errorCode: null,
            latencyMs: null,
            fetchedAt,
            sourceTimestamp: null,
            sourceLabel: "M"
          },
          {
            provider: "edinetDb",
            ok: false,
            message: "live mode disabled",
            errorCode: null,
            latencyMs: null,
            fetchedAt,
            sourceTimestamp: null,
            sourceLabel: "M"
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

    const yahooStart = Date.now();
    try {
      quotes = await this.primaryQuoteProvider.getQuotes(codes);
      quoteOk = true;
      health.push({
        provider: "yahoo",
        ok: true,
        message: null,
        errorCode: null,
        latencyMs: Date.now() - yahooStart,
        fetchedAt: new Date().toISOString(),
        sourceTimestamp: latestTimestamp(quotes.map((quote) => quote.sourceTimestamp)),
        sourceLabel: "YF"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Yahoo request failed.";
      errors.push(`Yahoo: ${message}`);
      health.push({
        provider: "yahoo",
        ok: false,
        message,
        errorCode: classifyProviderError(message),
        latencyMs: Date.now() - yahooStart,
        fetchedAt: new Date().toISOString(),
        sourceTimestamp: null,
        sourceLabel: null
      });
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
        health.push({
          provider: "alphaVantage",
          ok: true,
          message: "fallback used",
          errorCode: null,
          latencyMs: Date.now() - alphaStart,
          fetchedAt: new Date().toISOString(),
          sourceTimestamp: latestTimestamp(fallbackQuotes.map((q) => q.sourceTimestamp)),
          sourceLabel: "AV",
          cumulativeCalls: this.getAlphaVantageCumulativeCalls()
        });
      } catch (fallbackError) {
        const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : "Alpha Vantage fallback failed.";
        errors.push(`Alpha Vantage: ${fallbackMsg}`);
        health.push({
          provider: "alphaVantage",
          ok: false,
          message: fallbackMsg,
          errorCode: classifyProviderError(fallbackMsg),
          latencyMs: Date.now() - alphaStart,
          fetchedAt: new Date().toISOString(),
          sourceTimestamp: null,
          sourceLabel: null,
          cumulativeCalls: this.getAlphaVantageCumulativeCalls()
        });
      }
    } else {
      health.push({
        provider: "alphaVantage",
        ok: true,
        message: "fallback not required",
        errorCode: null,
        latencyMs: 0,
        fetchedAt: new Date().toISOString(),
        sourceTimestamp: null,
        sourceLabel: "AV",
        cumulativeCalls: this.getAlphaVantageCumulativeCalls()
      });
    }

    if (fundamentalsDeferred) {
      fundamentalsOk = true;
      health.push({
        provider: "edinetDb",
        ok: true,
        message: "deferred to phase2",
        errorCode: null,
        latencyMs: 0,
        fetchedAt: new Date().toISOString(),
        sourceTimestamp: null,
        sourceLabel: null
      });
    } else {
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
          sourceLabel: "C"
        });
      } catch (error) {
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
    }

    if (!quoteOk && !fundamentalsOk) {
      const stocks = withMockSourceLabels(mockStocks);
      return {
        stocks,
        dataMode: "mock",
        sourceLabel: "M",
        sourceMeta: buildSourceMeta(stocks, "M"),
        lastUpdatedAt: fetchedAt,
        error: buildErrorMessage(errors),
        fallbackReason: fundamentalsDeferred
          ? "価格データ取得に失敗したため、mock データを表示しています。"
          : fallbackReasonByState(quoteOk, fundamentalsOk, []),
        health
      };
    }

    const mergedStocks = mergeStocks(codes, mockStocks, quotes, fundamentals);
    const quoteMap = new Map(quotes.map((quote) => [quote.code, quote]));
    const missingMinimum = codes.filter((code) => !quoteHasMinimumFields(quoteMap.get(code)));
    const dataMode: DataMode =
      quoteOk && (fundamentalsDeferred || fundamentalsOk) && missingMinimum.length === 0 ? "live" : "fallback";
    const missingMessage =
      missingMinimum.length > 0 ? `minimum quote fields missing: ${missingMinimum.join(", ")}` : "";
    const fallbackReason = fundamentalsDeferred
      ? !quoteOk
        ? "価格データ取得に失敗したため、mock データを表示しています。"
        : missingMinimum.length > 0
          ? `一部銘柄の価格必須項目が不足したため補助データで表示しています（${missingMinimum.join(", ")}）。`
          : null
      : fallbackReasonByState(quoteOk, fundamentalsOk, missingMinimum);
    const sourceLabel = resolveOverallSourceLabel(dataMode, quotes);

    return {
      stocks: mergedStocks,
      dataMode,
      sourceLabel,
      sourceMeta: buildSourceMeta(mergedStocks, sourceLabel),
      lastUpdatedAt: fetchedAt,
      error: dataMode === "live" ? null : buildErrorMessage([...errors, missingMessage]),
      fallbackReason: dataMode === "live" ? null : fallbackReason,
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
