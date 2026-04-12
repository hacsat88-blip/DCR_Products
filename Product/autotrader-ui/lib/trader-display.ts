import type {
  AISelectionMode,
  FeedRole,
  FeedSource,
  RawTraderAction,
  TradeMode
} from "@/types/trader";

const ACTION_LABELS: Record<RawTraderAction, string> = {
  buy: "買い",
  sell: "売り",
  hold: "見送り",
  none: "未判定"
};

const AI_MODE_LABELS: Record<AISelectionMode, string> = {
  gemini: "Gemini",
  hybrid: "ハイブリッド"
};

const TRADE_MODE_LABELS: Record<TradeMode, string> = {
  conservative: "慎重",
  balanced: "標準",
  aggressive: "積極"
};

const FEED_ROLE_LABELS: Record<FeedRole, string> = {
  execution: "執行",
  reference: "参照"
};

const FEED_SOURCE_LABELS: Record<FeedSource, string> = {
  rakuten_rss: "楽天RSS",
  jquants_light: "J-Quants Light",
  jquants_free: "J-Quants Free"
};

export function getActionLabel(value: RawTraderAction): string {
  return ACTION_LABELS[value];
}

export function getAiModeLabel(value: AISelectionMode): string {
  return AI_MODE_LABELS[value];
}

export function getTradeModeLabel(value: TradeMode): string {
  return TRADE_MODE_LABELS[value];
}

export function getFeedRoleLabel(value: FeedRole | null): string | null {
  return value ? FEED_ROLE_LABELS[value] : null;
}

export function getFeedSourceLabel(value: FeedSource | null): string | null {
  return value ? FEED_SOURCE_LABELS[value] : null;
}