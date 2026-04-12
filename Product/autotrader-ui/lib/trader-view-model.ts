import { MAX_EVENT_HISTORY } from "@/lib/constants";
import type {
  AISelectionMode,
  ConnectionState,
  FeedRole,
  FeedSource,
  RawTraderAction,
  RawTraderPayload,
  RawTraderRiskSnapshot,
  RawTraderRiskRuntimeSnapshot,
  TradeMode,
  TraderEventSnapshot,
  TraderViewModel
} from "@/types/trader";

const AI_MODES: AISelectionMode[] = ["gemini"];
const FEED_ROLES: FeedRole[] = ["execution", "reference"];
const FEED_SOURCES: FeedSource[] = ["rakuten_rss", "jquants_light", "jquants_free"];
const RAW_ACTIONS: RawTraderAction[] = ["buy", "sell", "hold", "none"];
const TRADING_MODES: TradeMode[] = ["conservative", "balanced", "aggressive"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function isOneOf<T extends string>(value: unknown, candidates: T[]): value is T {
  return typeof value === "string" && candidates.includes(value as T);
}

function isRawTraderPrice(value: unknown): value is RawTraderPayload["price"] {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    isFiniteNumber(value.current) &&
    isFiniteNumber(value.volume) &&
    isOneOf(value.feed_role, FEED_ROLES) &&
    isOneOf(value.feed_source, FEED_SOURCES)
  );
}

function isRawTraderActionPayload(value: unknown): value is RawTraderPayload["last_action"] {
  return (
    isRecord(value) &&
    isOneOf(value.action, RAW_ACTIONS) &&
    isFiniteNumber(value.qty) &&
    typeof value.reason === "string" &&
    typeof value.at === "string" &&
    isOneOf(value.feed_role, FEED_ROLES) &&
    isOneOf(value.feed_source, FEED_SOURCES)
  );
}

function isRawTraderRiskSnapshot(value: unknown): value is RawTraderRiskSnapshot {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isFiniteNumber(value.limit_per_order) &&
    isFiniteNumber(value.stop_loss_pct) &&
    isFiniteNumber(value.max_qty_per_order) &&
    isFiniteNumber(value.poll_interval_sec) &&
    isOneOf(value.ai_mode, AI_MODES) &&
    isOneOf(value.trading_mode, TRADING_MODES) &&
    isFiniteNumber(value.available_cash) &&
    value.execution_feed === "rakuten_rss" &&
    isOneOf(value.reference_feed, ["jquants_light", "jquants_free"]) &&
    typeof value.prioritize_manual_price_band === "boolean" &&
    isFiniteNumber(value.manual_price_min) &&
    isFiniteNumber(value.manual_price_max) &&
    isNullableNumber(value.max_daily_orders) &&
    isNullableNumber(value.max_concurrent_positions) &&
    isFiniteNumber(value.max_daily_loss_yen) &&
    isFiniteNumber(value.max_consecutive_losses) &&
    isFiniteNumber(value.cooldown_minutes_after_loss) &&
    isFiniteNumber(value.min_five_bar_range_pct) &&
    isFiniteNumber(value.min_last_bar_volume_ratio) &&
    isFiniteNumber(value.max_reference_gap_pct) &&
    isFiniteNumber(value.flat_before_close_minutes) &&
    isFiniteNumber(value.max_spread_bps) &&
    isFiniteNumber(value.skip_open_minutes) &&
    isFiniteNumber(value.suggested_price_min) &&
    isFiniteNumber(value.suggested_price_max) &&
    isFiniteNumber(value.effective_price_min) &&
    isFiniteNumber(value.effective_price_max) &&
    isFiniteNumber(value.effective_max_daily_orders) &&
    isFiniteNumber(value.effective_max_concurrent_positions)
  );
}

function isRawTraderRiskRuntimeSnapshot(value: unknown): value is RawTraderRiskRuntimeSnapshot {
  return (
    isRecord(value) &&
    isFiniteNumber(value.daily_order_count) &&
    isFiniteNumber(value.daily_realized_pnl) &&
    isFiniteNumber(value.consecutive_loss_count) &&
    isFiniteNumber(value.cooldown_remaining_sec) &&
    typeof value.entry_blocked === "boolean" &&
    (value.entry_block_reason === null || typeof value.entry_block_reason === "string")
  );
}

export function isRawTraderPayload(value: unknown): value is RawTraderPayload {
  if (!isRecord(value) || value.type !== "state_update" || typeof value.ts !== "string") {
    return false;
  }

  if (!isRawTraderPrice(value.price) || !isRecord(value.position) || !isRawTraderActionPayload(value.last_action)) {
    return false;
  }

  return (
    (value.reference_price === null || isRawTraderPrice(value.reference_price)) &&
    isFiniteNumber(value.position.qty) &&
    isFiniteNumber(value.position.avg_cost) &&
    isFiniteNumber(value.position.pnl) &&
    isFiniteNumber(value.position.pnl_pct) &&
    isRawTraderRiskSnapshot(value.risk) &&
    isRawTraderRiskRuntimeSnapshot(value.risk_runtime)
  );
}

function trimHistory(history: TraderEventSnapshot[]): TraderEventSnapshot[] {
  return history.slice(-MAX_EVENT_HISTORY);
}

function toEventSnapshot(raw: RawTraderPayload): TraderEventSnapshot {
  return {
    action: raw.last_action.action,
    qty: raw.last_action.qty,
    reason: raw.last_action.reason,
    at: raw.last_action.at,
    feedRole: raw.last_action.feed_role,
    feedSource: raw.last_action.feed_source
  };
}

function toPriceSnapshot(raw: RawTraderPayload["price"]): TraderViewModel["latestPrice"] {
  return {
    code: raw.code,
    current: raw.current,
    volume: raw.volume,
    feedRole: raw.feed_role,
    feedSource: raw.feed_source
  };
}

function toRiskRuntimeSnapshot(
  raw: RawTraderPayload["risk_runtime"]
): NonNullable<TraderViewModel["riskRuntimeSnapshot"]> {
  return {
    dailyOrderCount: raw.daily_order_count,
    dailyRealizedPnl: raw.daily_realized_pnl,
    consecutiveLossCount: raw.consecutive_loss_count,
    cooldownRemainingSec: raw.cooldown_remaining_sec,
    entryBlocked: raw.entry_blocked,
    entryBlockReason: raw.entry_block_reason
  };
}

function isExecutionPlaceholder(price: RawTraderPayload["price"]): boolean {
  return (
    price.code === "-" &&
    price.current === 0 &&
    price.volume === 0 &&
    price.feed_role === "execution" &&
    price.feed_source === "rakuten_rss"
  );
}

export function createInitialTraderState(
  connectionState: ConnectionState = "waiting-first-tick"
): TraderViewModel {
  return {
    connectionState,
    lastUpdatedAt: null,
    latestPrice: {
      code: null,
      current: null,
      volume: null,
      feedRole: null,
      feedSource: null
    },
    referencePrice: {
      code: null,
      current: null,
      volume: null,
      feedRole: null,
      feedSource: null
    },
    positionSnapshot: {
      qty: null,
      avgCost: null,
      pnl: null,
      pnlPct: null
    },
    latestEvent: {
      action: "none",
      qty: 0,
      reason: "起動中",
      at: "",
      feedRole: null,
      feedSource: null
    },
    aiEventHistory: [],
    orderHistory: [],
    riskSnapshot: null,
    riskRuntimeSnapshot: null
  };
}

export function reduceTraderState(
  prev: TraderViewModel | undefined,
  raw: unknown
): TraderViewModel {
  const current = prev ?? createInitialTraderState();

  if (!isRawTraderPayload(raw)) {
    return current;
  }

  const latestEvent = toEventSnapshot(raw);
  const aiEventHistory =
    latestEvent.action === "none"
      ? current.aiEventHistory
      : trimHistory([...current.aiEventHistory, latestEvent]);
  const orderHistory =
    latestEvent.action === "buy" || latestEvent.action === "sell"
      ? trimHistory([...current.orderHistory, latestEvent])
      : current.orderHistory;
  const latestPrice = isExecutionPlaceholder(raw.price)
    ? current.latestPrice
    : toPriceSnapshot(raw.price);
  const referencePrice = raw.reference_price
    ? toPriceSnapshot(raw.reference_price)
    : current.referencePrice;

  return {
    connectionState: "connected",
    lastUpdatedAt: raw.ts,
    latestPrice,
    referencePrice,
    positionSnapshot: {
      qty: raw.position.qty,
      avgCost: raw.position.avg_cost,
      pnl: raw.position.pnl,
      pnlPct: raw.position.pnl_pct
    },
    latestEvent,
    aiEventHistory,
    orderHistory,
    riskSnapshot: raw.risk,
    riskRuntimeSnapshot: toRiskRuntimeSnapshot(raw.risk_runtime)
  };
}