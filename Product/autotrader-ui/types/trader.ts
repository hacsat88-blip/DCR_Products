export type AISelectionMode = "gemini";
export type TradeMode = "conservative" | "balanced" | "aggressive";
export type FeedRole = "execution" | "reference";
export type FeedSource = "rakuten_rss" | "jquants_light" | "jquants_free";
export type RawTraderAction = "buy" | "sell" | "hold" | "none";

export interface RawTraderPrice {
  code: string;
  current: number;
  volume: number;
  feed_role: FeedRole;
  feed_source: FeedSource;
}

export interface RawTraderPosition {
  qty: number;
  avg_cost: number;
  pnl: number;
  pnl_pct: number;
}

export interface RawTraderActionPayload {
  action: RawTraderAction;
  qty: number;
  reason: string;
  at: string;
  feed_role: FeedRole;
  feed_source: FeedSource;
}

export interface RawTraderRiskSnapshot {
  limit_per_order: number;
  stop_loss_pct: number;
  max_qty_per_order: number;
  poll_interval_sec: number;
  ai_mode: AISelectionMode;
  trading_mode: TradeMode;
  available_cash: number;
  execution_feed: "rakuten_rss";
  reference_feed: "jquants_light" | "jquants_free";
  prioritize_manual_price_band: boolean;
  manual_price_min: number;
  manual_price_max: number;
  max_daily_orders: number | null;
  max_concurrent_positions: number | null;
  suggested_price_min: number;
  suggested_price_max: number;
  effective_price_min: number;
  effective_price_max: number;
  effective_max_daily_orders: number;
  effective_max_concurrent_positions: number;
}

export type RiskSettingsResponse = RawTraderRiskSnapshot;

export interface RawTraderPayload {
  type: "state_update";
  ts: string;
  price: RawTraderPrice;
  reference_price: RawTraderPrice | null;
  position: RawTraderPosition;
  last_action: RawTraderActionPayload;
  risk: RawTraderRiskSnapshot;
}

export type ConnectionState = "waiting-first-tick" | "connected" | "reconnecting" | "stale";

export interface TraderPriceSnapshot {
  code: string | null;
  current: number | null;
  volume: number | null;
  feedRole: FeedRole | null;
  feedSource: FeedSource | null;
}

export interface TraderPositionSnapshot {
  qty: number | null;
  avgCost: number | null;
  pnl: number | null;
  pnlPct: number | null;
}

export interface TraderEventSnapshot {
  action: RawTraderAction;
  qty: number;
  reason: string;
  at: string;
  feedRole: FeedRole | null;
  feedSource: FeedSource | null;
}

export interface TraderViewModel {
  connectionState: ConnectionState;
  lastUpdatedAt: string | null;
  latestPrice: TraderPriceSnapshot;
  referencePrice: TraderPriceSnapshot;
  positionSnapshot: TraderPositionSnapshot;
  latestEvent: TraderEventSnapshot;
  aiEventHistory: TraderEventSnapshot[];
  orderHistory: TraderEventSnapshot[];
  riskSnapshot: RawTraderRiskSnapshot | null;
}