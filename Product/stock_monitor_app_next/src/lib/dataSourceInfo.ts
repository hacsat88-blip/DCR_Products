import { DataSourceInfoView } from "@/types/dataSourceInfo";

const STOCKS_CACHE_MIN_SECONDS = 60;
const STOCKS_CACHE_MAX_SECONDS = 300;
const STOCKS_CACHE_DEFAULT_SECONDS = 120;
const PROVIDER_CACHE_MIN_SECONDS = 15 * 60;
const PROVIDER_CACHE_MAX_SECONDS = 60 * 60;
const PROVIDER_CACHE_DEFAULT_SECONDS = 1800;
const ALPHA_VANTAGE_API_KEY_ENV = "ALPHA_VANTAGE_API_KEY";

function clampTtlSeconds(raw: string | undefined, min: number, max: number, fallback: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function formatTtl(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainMinutes = minutes % 60;
    return remainMinutes > 0 ? `${hours}時間${remainMinutes}分` : `${hours}時間`;
  }
  return `${minutes}分`;
}

function maskApiKeySuffix(rawKey: string | undefined): string {
  const key = rawKey?.trim();
  if (!key) {
    return "未設定";
  }
  if (key.length < 4) {
    return "****";
  }
  return `****${key.slice(-4)}`;
}

export function buildDataSourceInfo(env: NodeJS.ProcessEnv = process.env): DataSourceInfoView {
  const stocksCacheTtl = clampTtlSeconds(
    env.STOCKS_CACHE_TTL_SECONDS,
    STOCKS_CACHE_MIN_SECONDS,
    STOCKS_CACHE_MAX_SECONDS,
    STOCKS_CACHE_DEFAULT_SECONDS
  );
  const yahooCacheTtl = clampTtlSeconds(
    env.YAHOO_PRICE_CACHE_TTL_SECONDS,
    PROVIDER_CACHE_MIN_SECONDS,
    PROVIDER_CACHE_MAX_SECONDS,
    PROVIDER_CACHE_DEFAULT_SECONDS
  );
  const alphaVantageCacheTtl = clampTtlSeconds(
    env.ALPHA_VANTAGE_PRICE_CACHE_TTL_SECONDS,
    PROVIDER_CACHE_MIN_SECONDS,
    PROVIDER_CACHE_MAX_SECONDS,
    PROVIDER_CACHE_DEFAULT_SECONDS
  );

  return {
    roles: {
      yf: "価格データの primary。通常は Yahoo Finance を先に利用し、日次価格を取得します。",
      av: "価格データの fallback。Yahoo 欠損時のみ Alpha Vantage で不足銘柄を補完します。"
    },
    cacheStrategy: [
      `/api/stocks ルートキャッシュ: ${stocksCacheTtl}秒（銘柄コード + phase 単位）`,
      `Yahoo 価格キャッシュ: ${yahooCacheTtl}秒（symbol 単位・約${formatTtl(yahooCacheTtl)}）`,
      `Alpha Vantage 価格キャッシュ: ${alphaVantageCacheTtl}秒（symbol 単位・約${formatTtl(alphaVantageCacheTtl)}）`
    ],
    apiKeySuffix: maskApiKeySuffix(env[ALPHA_VANTAGE_API_KEY_ENV]),
    callLimitGuidance: [
      "YF: 公式の固定上限は公開されていないため、短時間の連続更新で 429 が出たら間隔を空けて再試行してください。",
      "AV: fallback 専用で利用し、無料枠運用時は 1日あたり 25 リクエストを目安にしてください。"
    ]
  };
}
