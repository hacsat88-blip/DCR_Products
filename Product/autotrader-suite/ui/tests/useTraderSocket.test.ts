import { renderHook, act } from "@testing-library/react";
import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";

import {
  MAX_EVENT_HISTORY,
  SOCKET_RECONNECT_MS,
  SOCKET_STALE_MS
} from "@/lib/constants";
import { reduceTraderState } from "@/lib/trader-view-model";
import { useTraderSocket } from "@/hooks/useTraderSocket";
import type { RawTraderPayload } from "@/types/trader";

type PayloadOverrides = Partial<Omit<RawTraderPayload, "price" | "reference_price" | "position" | "last_action" | "risk">> & {
  price?: Partial<RawTraderPayload["price"]>;
  reference_price?: Partial<NonNullable<RawTraderPayload["reference_price"]>> | null;
  position?: Partial<RawTraderPayload["position"]>;
  last_action?: Partial<RawTraderPayload["last_action"]>;
  risk?: Partial<RawTraderPayload["risk"]>;
  risk_runtime?: Partial<RawTraderPayload["risk_runtime"]>;
};

const BASE_RISK: RawTraderPayload["risk"] = {
  limit_per_order: 100000,
  stop_loss_pct: 3,
  max_qty_per_order: 100,
  poll_interval_sec: 5,
  ai_mode: "gemini",
  trading_mode: "conservative",
  available_cash: 290000,
  execution_feed: "rakuten_rss",
  reference_feed: "jquants_light",
  prioritize_manual_price_band: true,
  manual_price_min: 100,
  manual_price_max: 500,
  max_daily_orders: null,
  max_concurrent_positions: null,
  max_daily_loss_yen: 15000,
  max_consecutive_losses: 2,
  cooldown_minutes_after_loss: 15,
  min_five_bar_range_pct: 0.8,
  min_last_bar_volume_ratio: 1.2,
  max_reference_gap_pct: 4,
  flat_before_close_minutes: 10,
  max_spread_bps: 20,
  skip_open_minutes: 5,
  suggested_price_min: 100,
  suggested_price_max: 290,
  effective_price_min: 100,
  effective_price_max: 500,
  effective_max_daily_orders: 3,
  effective_max_concurrent_positions: 1
};

const BASE_RISK_RUNTIME: RawTraderPayload["risk_runtime"] = {
  daily_order_count: 0,
  daily_realized_pnl: 0,
  consecutive_loss_count: 0,
  cooldown_remaining_sec: 0,
  entry_blocked: false,
  entry_block_reason: null
};

function buildPayload(overrides: PayloadOverrides = {}): RawTraderPayload {
  const {
    price,
    reference_price,
    position,
    last_action,
    risk,
    risk_runtime,
    ...restOverrides
  } = overrides;

  return {
    type: "state_update",
    ts: "2026-04-12T10:30:05",
    price: {
      code: "7203",
      current: 250,
      volume: 10000,
      feed_role: "execution",
      feed_source: "rakuten_rss",
      ...price
    },
    reference_price:
      reference_price === undefined || reference_price === null
        ? null
        : {
            code: "7203",
            current: 251,
            volume: 10500,
            feed_role: "reference",
            feed_source: "jquants_light",
            ...reference_price
          },
    position: {
      qty: 0,
      avg_cost: 0,
      pnl: 0,
      pnl_pct: 0,
      ...position
    },
    last_action: {
      action: "buy",
      qty: 10,
      reason: "初回買い",
      at: "10:30:05",
      feed_role: "execution",
      feed_source: "rakuten_rss",
      ...last_action
    },
    risk: {
      ...BASE_RISK,
      ...risk
    },
    risk_runtime: {
      ...BASE_RISK_RUNTIME,
      ...risk_runtime
    },
    ...restOverrides
  };
}

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  readonly url: string;

  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string | URL) {
    this.url = String(url);
    MockWebSocket.instances.push(this);
  }

  close(): void {
    this.emitClose();
  }

  emitMessage(payload: unknown): void {
    this.onmessage?.({ data: JSON.stringify(payload) } as MessageEvent<string>);
  }

  emitClose(): void {
    this.onclose?.({ code: 1006 } as CloseEvent);
  }

  emitError(): void {
    this.onerror?.({ type: "error" } as Event);
  }

  static reset(): void {
    MockWebSocket.instances = [];
  }
}

describe("reduceTraderState", () => {
  test("reference hold stays in ai log but not in order history", () => {
    const next = reduceTraderState(undefined, buildPayload({
      price: {
        current: 250,
        volume: 10000,
        feed_role: "execution",
        feed_source: "rakuten_rss"
      },
      reference_price: {
        current: 251,
        volume: 10500,
        feed_role: "reference",
        feed_source: "jquants_free"
      },
      last_action: {
        action: "hold",
        qty: 0,
        reason: "J-Quants 参照更新",
        feed_role: "reference",
        feed_source: "jquants_free"
      },
      risk: {
        reference_feed: "jquants_free"
      }
    }));

    expect(next.aiEventHistory).toHaveLength(1);
    expect(next.orderHistory).toHaveLength(0);
    expect(next.latestEvent.feedRole).toBe("reference");
    expect(next.latestPrice.feedRole).toBe("execution");
    expect(next.referencePrice.feedRole).toBe("reference");
  });

  test("rejects malformed payloads and preserves previous state", () => {
    const prev = reduceTraderState(undefined, buildPayload());
    const next = reduceTraderState(prev, {
      type: "unexpected"
    });

    expect(next).toBe(prev);
  });

  test("trims ai and order histories to 50 entries", () => {
    let state = reduceTraderState(undefined, buildPayload());

    for (let index = 1; index <= MAX_EVENT_HISTORY + 5; index += 1) {
      state = reduceTraderState(state, buildPayload({
        ts: `2026-04-12T10:30:${String(index).padStart(2, "0")}`,
        last_action: {
          action: "buy",
          qty: index,
          reason: `decision-${index}`,
          at: `10:30:${String(index).padStart(2, "0")}`
        }
      }));
    }

    expect(state.aiEventHistory).toHaveLength(MAX_EVENT_HISTORY);
    expect(state.orderHistory).toHaveLength(MAX_EVENT_HISTORY);
    expect(state.aiEventHistory[0]?.reason).toBe("decision-6");
    expect(state.orderHistory.at(-1)?.reason).toBe(`decision-${MAX_EVENT_HISTORY + 5}`);
  });

  test("keeps runtime risk snapshot from payload", () => {
    const next = reduceTraderState(undefined, buildPayload({
      risk_runtime: {
        daily_realized_pnl: -1200,
        consecutive_loss_count: 2,
        cooldown_remaining_sec: 180,
        entry_blocked: true,
        entry_block_reason: "損失後クールダウン中"
      }
    }));

    expect(next.riskRuntimeSnapshot?.dailyRealizedPnl).toBe(-1200);
    expect(next.riskRuntimeSnapshot?.consecutiveLossCount).toBe(2);
    expect(next.riskRuntimeSnapshot?.cooldownRemainingSec).toBe(180);
    expect(next.riskRuntimeSnapshot?.entryBlocked).toBe(true);
  });
});

describe("useTraderSocket", () => {
  beforeEach(() => {
    MockWebSocket.reset();
    vi.useFakeTimers();
    vi.stubGlobal("WebSocket", MockWebSocket as unknown as typeof WebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  test("starts in waiting-first-tick before the first socket message", () => {
    const { result } = renderHook(() => useTraderSocket());

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(result.current.connectionState).toBe("waiting-first-tick");
  });

  test("marks state stale after 15 seconds without updates", () => {
    const { result } = renderHook(() => useTraderSocket());
    const socket = MockWebSocket.instances[0];

    act(() => {
      socket?.emitMessage(buildPayload());
    });

    expect(result.current.connectionState).toBe("connected");

    act(() => {
      vi.advanceTimersByTime(SOCKET_STALE_MS - 1);
    });

    expect(result.current.connectionState).toBe("connected");

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current.connectionState).toBe("stale");
  });

  test("reconnects 5 seconds after socket close", () => {
    const { result } = renderHook(() => useTraderSocket());
    const firstSocket = MockWebSocket.instances[0];

    act(() => {
      firstSocket?.emitClose();
    });

    expect(result.current.connectionState).toBe("reconnecting");
    expect(MockWebSocket.instances).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(SOCKET_RECONNECT_MS);
    });

    expect(MockWebSocket.instances).toHaveLength(2);
  });

  test("reconnects 5 seconds after socket error", () => {
    const { result } = renderHook(() => useTraderSocket());
    const firstSocket = MockWebSocket.instances[0];

    act(() => {
      firstSocket?.emitError();
    });

    expect(result.current.connectionState).toBe("reconnecting");

    act(() => {
      vi.advanceTimersByTime(SOCKET_RECONNECT_MS);
    });

    expect(MockWebSocket.instances).toHaveLength(2);
  });
});