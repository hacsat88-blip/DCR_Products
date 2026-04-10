import { DataMode, ProviderHealth } from "@/services/providers/types";
import { StockSourceMeta } from "@/types/source";

export type DataSourceStatus = "live" | "fallback" | "mock" | "error";
const DEFAULT_FALLBACK_REASON = "実データの取得に失敗したため、補助データを表示しています。";

interface ResolveDataSourceStatusInput {
  dataMode: DataMode;
  sourceMeta?: StockSourceMeta | null;
  health?: ProviderHealth[];
  error?: string | null;
}

const PRICE_PROVIDERS = new Set<ProviderHealth["provider"]>([
  "yahoo",
  "alphaVantage",
  "jquants",
]);

function hasHardError(health: ProviderHealth[]): boolean {
  const priceHealth = health.filter((item) => PRICE_PROVIDERS.has(item.provider));
  if (priceHealth.length === 0) {
    return false;
  }
  return priceHealth.every((item) => !item.ok);
}

function alphaFallbackUsed(health: ProviderHealth[]): boolean {
  const alphaHealth = health.find((item) => item.provider === "alphaVantage");
  if (!alphaHealth) {
    return false;
  }
  return alphaHealth.decision === "used" || (alphaHealth.message?.toLowerCase().includes("fallback used") ?? false);
}

export function resolveDataSourceStatus({
  dataMode,
  sourceMeta,
  health = [],
  error
}: ResolveDataSourceStatusInput): DataSourceStatus {
  if (dataMode === "mock") {
    if (error) {
      return "error";
    }
    return "mock";
  }

  if (error || hasHardError(health)) {
    return "error";
  }

  if (dataMode === "fallback" || sourceMeta?.price === "AV" || alphaFallbackUsed(health)) {
    return "fallback";
  }

  return "live";
}

export function dataSourceStatusLabel(status: DataSourceStatus): string {
  if (status === "live") return "🟢 ライブ";
  if (status === "fallback") return "🟡 フォールバック";
  if (status === "mock") return "⚪ モック";
  return "🔴 エラー";
}

export function dataSourceStatusDotClass(status: DataSourceStatus): string {
  if (status === "live") return "bg-positive";
  if (status === "fallback") return "bg-amber";
  if (status === "mock") return "bg-text-muted";
  return "bg-danger";
}

export function dataSourceStatusBadgeClass(status: DataSourceStatus): string {
  if (status === "live") return "border-positive/35 bg-positive/10 text-positive";
  if (status === "fallback") return "border-amber/35 bg-amber/10 text-amber";
  if (status === "mock") return "border-border-subtle bg-canvas-deep/60 text-text-muted";
  return "border-danger/35 bg-danger/10 text-danger";
}

export function resolveFallbackReasonLabel(
  status: DataSourceStatus,
  fallbackReason?: string | null
): string | null {
  const normalized = fallbackReason?.trim() ?? "";
  if (normalized.length > 0) {
    return normalized;
  }
  if (status === "fallback" || status === "mock" || status === "error") {
    return DEFAULT_FALLBACK_REASON;
  }
  return null;
}

