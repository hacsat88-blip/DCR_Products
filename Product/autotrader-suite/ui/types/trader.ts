export type AISelectionMode = "gemini";
export type TradeMode = "conservative" | "balanced" | "aggressive";
export type FeedRole = "execution" | "reference";
export type FeedSource = "rakuten_rss" | "jquants_light" | "jquants_free";
export type RunMode = "paper" | "live";
export type OrderExecutionMode = "stub_only" | "broker_auto";
export type RawTraderAction = "buy" | "sell" | "hold" | "none";
export type HealthStatus = "healthy" | "degraded";
export type HealthReadiness = "ready" | "degraded";

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
  max_daily_loss_yen: number;
  max_consecutive_losses: number;
  cooldown_minutes_after_loss: number;
  min_five_bar_range_pct: number;
  min_last_bar_volume_ratio: number;
  max_reference_gap_pct: number;
  flat_before_close_minutes: number;
  max_spread_bps: number;
  skip_open_minutes: number;
  suggested_price_min: number;
  suggested_price_max: number;
  effective_price_min: number;
  effective_price_max: number;
  effective_max_daily_orders: number;
  effective_max_concurrent_positions: number;
}

export type RiskSettingsResponse = RawTraderRiskSnapshot;

export interface RawTraderRiskRuntimeSnapshot {
  daily_order_count: number;
  daily_realized_pnl: number;
  consecutive_loss_count: number;
  cooldown_remaining_sec: number;
  entry_blocked: boolean;
  entry_block_reason: string | null;
}

export interface RawTraderPayload {
  type: "state_update";
  ts: string;
  price: RawTraderPrice;
  reference_price: RawTraderPrice | null;
  position: RawTraderPosition;
  last_action: RawTraderActionPayload;
  risk: RawTraderRiskSnapshot;
  risk_runtime: RawTraderRiskRuntimeSnapshot;
}

export interface RawTraderHealthPayload {
  status: HealthStatus;
  mode: RunMode;
  order_mode: OrderExecutionMode;
  live_armed?: boolean;
  server_time: string;
  last_price_tick_at: string | null;
  last_price_code: string | null;
  ai_status: HealthReadiness;
  reference_status: HealthReadiness;
  last_warning: string | null;
}

export type ConnectionState = "waiting-first-tick" | "connected" | "reconnecting" | "stale";
export type TraderHealthFetchState = "loading" | "ready" | "unreachable";

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

export interface TraderRiskRuntimeSnapshot {
  dailyOrderCount: number;
  dailyRealizedPnl: number;
  consecutiveLossCount: number;
  cooldownRemainingSec: number;
  entryBlocked: boolean;
  entryBlockReason: string | null;
}

export interface TraderHealthSnapshot {
  status: HealthStatus;
  mode: RunMode;
  orderMode: OrderExecutionMode;
  liveArmed: boolean;
  serverTime: string;
  lastPriceTickAt: string | null;
  lastPriceCode: string | null;
  aiStatus: HealthReadiness;
  referenceStatus: HealthReadiness;
  lastWarning: string | null;
}

export interface TraderHealthViewModel {
  fetchState: TraderHealthFetchState;
  snapshot: TraderHealthSnapshot | null;
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
  riskRuntimeSnapshot: TraderRiskRuntimeSnapshot | null;
}