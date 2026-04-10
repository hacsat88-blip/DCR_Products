import { SourceLabel, resolveSourceLabel } from "@/types/source";

import { DataMode, ProviderDecision, ProviderErrorCode, ProviderHealth, Quote } from "./types";

export function quoteHasMinimumFields(quote: Quote | undefined): boolean {
  return Boolean(quote && quote.price !== null && quote.changePercent !== null);
}

export function buildErrorMessage(parts: string[]): string | null {
  const cleaned = parts.map((part) => part.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.join(" / ") : null;
}

export function latestTimestamp(values: Array<string | null | undefined>): string | null {
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

export function classifyProviderError(message: string): ProviderErrorCode {
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

export function fallbackReasonByState(
  quoteOk: boolean,
  fundamentalsOk: boolean,
  missingMinimumCodes: string[]
): string | null {
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

export interface ResolveFallbackPolicyInput {
  quoteOk: boolean;
  fundamentalsOk: boolean;
  fundamentalsDeferred: boolean;
  missingMinimumCodes: string[];
}

export interface ResolveFallbackPolicyResult {
  dataMode: DataMode;
  fallbackReason: string | null;
  missingMinimumMessage: string | null;
}

export function resolveFallbackPolicy(input: ResolveFallbackPolicyInput): ResolveFallbackPolicyResult {
  const { quoteOk, fundamentalsOk, fundamentalsDeferred, missingMinimumCodes } = input;
  const dataMode: DataMode =
    quoteOk && (fundamentalsDeferred || fundamentalsOk) && missingMinimumCodes.length === 0 ? "live" : "fallback";

  const fallbackReason = fundamentalsDeferred
    ? !quoteOk
      ? "価格データ取得に失敗したため、mock データを表示しています。"
      : missingMinimumCodes.length > 0
        ? `一部銘柄の価格必須項目が不足したため補助データで表示しています（${missingMinimumCodes.join(", ")}）。`
        : null
    : fallbackReasonByState(quoteOk, fundamentalsOk, missingMinimumCodes);

  const missingMinimumMessage =
    missingMinimumCodes.length > 0 ? `minimum quote fields missing: ${missingMinimumCodes.join(", ")}` : null;

  return {
    dataMode,
    fallbackReason,
    missingMinimumMessage
  };
}

export function resolveOverallSourceLabel(dataMode: DataMode, quotes: Quote[]): SourceLabel {
  if (dataMode === "mock") {
    return "M";
  }
  return resolveSourceLabel(quotes.map((quote) => quote.sourceLabel ?? null));
}

export function createProviderHealthRecord(input: ProviderHealth & { decision: ProviderDecision }): ProviderHealth {
  return input;
}

export function buildLiveModeDisabledHealth(fetchedAt: string): ProviderHealth[] {
  return [
    createProviderHealthRecord({
      provider: "yahoo",
      ok: false,
      message: "live mode disabled",
      decision: "disabled",
      errorCode: null,
      latencyMs: null,
      fetchedAt,
      sourceTimestamp: null,
      sourceLabel: "M"
    }),
    createProviderHealthRecord({
      provider: "alphaVantage",
      ok: false,
      message: "live mode disabled",
      decision: "disabled",
      errorCode: null,
      latencyMs: null,
      fetchedAt,
      sourceTimestamp: null,
      sourceLabel: "M"
    }),
    createProviderHealthRecord({
      provider: "edinetDb",
      ok: false,
      message: "live mode disabled",
      decision: "disabled",
      errorCode: null,
      latencyMs: null,
      fetchedAt,
      sourceTimestamp: null,
      sourceLabel: "M"
    })
  ];
}
