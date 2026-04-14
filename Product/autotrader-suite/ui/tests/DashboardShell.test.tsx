import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import HomePage from "@/app/page";
import type { TraderEventSnapshot, TraderHealthViewModel, TraderViewModel } from "@/types/trader";

const useTraderSocketMock = vi.fn<() => TraderViewModel>();
const useTraderHealthMock = vi.fn<() => TraderHealthViewModel>();

vi.mock("@/hooks/useTraderSocket", () => ({
  useTraderSocket: (): TraderViewModel => useTraderSocketMock()
}));

vi.mock("@/hooks/useTraderHealth", () => ({
  useTraderHealth: (): TraderHealthViewModel => useTraderHealthMock()
}));

vi.mock("@/components/RiskSettingsAccordion", () => ({
  RiskSettingsAccordion: (): ReturnType<typeof createElement> =>
    createElement("div", { children: "settings-panel-stub" })
}));

function buildEvent(overrides: Partial<TraderEventSnapshot> = {}): TraderEventSnapshot {
  return {
    action: "none",
    qty: 0,
    reason: "起動中",
    at: "",
    feedRole: null,
    feedSource: null,
    ...overrides
  };
}

function buildState(overrides: Partial<TraderViewModel> = {}): TraderViewModel {
  return {
    connectionState: "waiting-first-tick",
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
    latestEvent: buildEvent({ reason: "初回データ待機" }),
    aiEventHistory: [],
    orderHistory: [],
    riskSnapshot: null,
    riskRuntimeSnapshot: null,
    ...overrides
  };
}

function buildHealth(overrides: Partial<TraderHealthViewModel> = {}): TraderHealthViewModel {
  return {
    fetchState: "loading",
    snapshot: null,
    ...overrides
  };
}

afterEach(() => {
  useTraderSocketMock.mockReset();
  useTraderHealthMock.mockReset();
});

describe("HomePage dashboard shell", () => {
  test("shows backend loading copy before health snapshot arrives", () => {
    useTraderSocketMock.mockReturnValue(buildState());
    useTraderHealthMock.mockReturnValue(buildHealth());

    render(createElement(HomePage));

    expect(screen.getAllByText("backend 状態確認中").length).toBeGreaterThan(0);
  });

  test("shows waiting-first-tick empty state", () => {
    useTraderSocketMock.mockReturnValue(buildState());
    useTraderHealthMock.mockReturnValue(
      buildHealth({
        fetchState: "ready",
        snapshot: {
          status: "healthy",
          mode: "paper",
          orderMode: "stub_only",
          liveArmed: false,
          serverTime: "2026-04-13T10:30:05",
          lastPriceTickAt: null,
          lastPriceCode: null,
          aiStatus: "ready",
          referenceStatus: "ready",
          lastWarning: null
        }
      })
    );

    render(createElement(HomePage));

    expect(screen.getByRole("heading", { name: "AutoTrader ダッシュボード" })).toBeInTheDocument();
    expect(screen.getAllByText("初回待機")).toHaveLength(2);
    expect(screen.getByText("監視コンソール")).toBeInTheDocument();
    expect(screen.getAllByText("紙運用 / 実発注なし").length).toBeGreaterThan(0);
    expect(screen.getAllByText("server 正常").length).toBeGreaterThan(0);
    expect(screen.getByText("ティック待機中")).toBeInTheDocument();
    expect(screen.getAllByText("未取得").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("初回データ待機")).toBeInTheDocument();
  });

  test("shows execution feed and latest execution event", () => {
    useTraderSocketMock.mockReturnValue(
      buildState({
        connectionState: "connected",
        lastUpdatedAt: "2026-04-12T10:30:05",
        latestPrice: {
          code: "7203",
          current: 250,
          volume: 10000,
          feedRole: "execution",
          feedSource: "rakuten_rss"
        },
        positionSnapshot: {
          qty: 100,
          avgCost: 248,
          pnl: 200,
          pnlPct: 0.81
        },
        latestEvent: buildEvent({
          action: "buy",
          qty: 100,
          reason: "初回買い",
          at: "10:30:05",
          feedRole: "execution",
          feedSource: "rakuten_rss"
        }),
        aiEventHistory: [
          buildEvent({
            action: "buy",
            qty: 100,
            reason: "初回買い",
            at: "10:30:05",
            feedRole: "execution",
            feedSource: "rakuten_rss"
          })
        ],
        orderHistory: [
          buildEvent({
            action: "buy",
            qty: 100,
            reason: "初回買い",
            at: "10:30:05",
            feedRole: "execution",
            feedSource: "rakuten_rss"
          })
        ],
        riskRuntimeSnapshot: {
          dailyOrderCount: 1,
          dailyRealizedPnl: 0,
          consecutiveLossCount: 0,
          cooldownRemainingSec: 0,
          entryBlocked: false,
          entryBlockReason: null
        }
      })
    );
    useTraderHealthMock.mockReturnValue(
      buildHealth({
        fetchState: "ready",
        snapshot: {
          status: "healthy",
          mode: "paper",
          orderMode: "stub_only",
          liveArmed: false,
          serverTime: "2026-04-13T10:30:05",
          lastPriceTickAt: "2026-04-13T10:30:00",
          lastPriceCode: "7203",
          aiStatus: "ready",
          referenceStatus: "ready",
          lastWarning: null
        }
      })
    );

    render(createElement(HomePage));

    expect(screen.getByText("執行 / 楽天RSS")).toBeInTheDocument();
    expect(screen.getByText("7203")).toBeInTheDocument();
    expect(screen.getByText("100株")).toBeInTheDocument();
    expect(screen.getByText("初回買い")).toBeInTheDocument();
    expect(screen.getAllByText(/^買い$/)).toHaveLength(2);
    expect(screen.getByText("楽天RSS")).toBeInTheDocument();
    expect(screen.getByText("10:30:05 / 100株 / 楽天RSS")).toBeInTheDocument();
    expect(screen.getByText("当日実現損益")).toBeInTheDocument();
    expect(screen.getByText("¥0.00")).toBeInTheDocument();
  });

  test("shows reference latest event but keeps hold out of order history", () => {
    useTraderSocketMock.mockReturnValue(
      buildState({
        connectionState: "connected",
        lastUpdatedAt: "2026-04-12T10:31:00",
        latestPrice: {
          code: "7203",
          current: 251,
          volume: 10500,
          feedRole: "execution",
          feedSource: "rakuten_rss"
        },
        referencePrice: {
          code: "7203",
          current: 251,
          volume: 10500,
          feedRole: "reference",
          feedSource: "jquants_free"
        },
        latestEvent: buildEvent({
          action: "hold",
          qty: 0,
          reason: "J-Quants 参照更新",
          at: "10:31:00",
          feedRole: "reference",
          feedSource: "jquants_free"
        }),
        aiEventHistory: [
          buildEvent({
            action: "hold",
            qty: 0,
            reason: "J-Quants 参照更新",
            at: "10:31:00",
            feedRole: "reference",
            feedSource: "jquants_free"
          })
        ],
        orderHistory: []
      })
    );
    useTraderHealthMock.mockReturnValue(
      buildHealth({
        fetchState: "ready",
        snapshot: {
          status: "degraded",
          mode: "paper",
          orderMode: "stub_only",
          liveArmed: false,
          serverTime: "2026-04-13T10:31:00",
          lastPriceTickAt: "2026-04-13T10:31:00",
          lastPriceCode: "7203",
          aiStatus: "ready",
          referenceStatus: "degraded",
          lastWarning: "J-Quants reference missing; execution onlyで継続"
        }
      })
    );

    render(createElement(HomePage));

    expect(screen.getByText("執行 / 楽天RSS")).toBeInTheDocument();
    expect(screen.getByText("参照価格 ¥251.00")).toBeInTheDocument();
    expect(screen.getByText("参照 / J-Quants Free")).toBeInTheDocument();
    expect(screen.getByText("J-Quants 参照更新")).toBeInTheDocument();
    expect(screen.getByText(/^見送り$/)).toBeInTheDocument();
    expect(screen.getByText("注文イベントなし")).toBeInTheDocument();
    expect(screen.getAllByText("参照価格なしで継続").length).toBeGreaterThan(0);
  });

  test("shows reference missing warning even when health stays ready", () => {
    useTraderSocketMock.mockReturnValue(buildState({ connectionState: "connected" }));
    useTraderHealthMock.mockReturnValue(
      buildHealth({
        fetchState: "ready",
        snapshot: {
          status: "healthy",
          mode: "paper",
          orderMode: "stub_only",
          liveArmed: false,
          serverTime: "2026-04-13T10:31:30",
          lastPriceTickAt: "2026-04-13T10:31:00",
          lastPriceCode: "7203",
          aiStatus: "ready",
          referenceStatus: "ready",
          lastWarning: "J-Quants reference missing; execution onlyで継続"
        }
      })
    );

    render(createElement(HomePage));

    expect(screen.getAllByText("参照価格なしで継続").length).toBeGreaterThan(0);
  });

  test("shows stale reference warning while health is degraded", () => {
    useTraderSocketMock.mockReturnValue(buildState({ connectionState: "connected" }));
    useTraderHealthMock.mockReturnValue(
      buildHealth({
        fetchState: "ready",
        snapshot: {
          status: "degraded",
          mode: "paper",
          orderMode: "stub_only",
          liveArmed: false,
          serverTime: "2026-04-13T10:31:30",
          lastPriceTickAt: "2026-04-13T10:31:00",
          lastPriceCode: "7203",
          aiStatus: "ready",
          referenceStatus: "degraded",
          lastWarning: "J-Quants reference stale (11 days); execution onlyで継続"
        }
      })
    );

    render(createElement(HomePage));

    expect(screen.getAllByText("参照価格なしで継続").length).toBeGreaterThan(0);
    expect(screen.getByText("J-Quants reference stale (11 days); execution onlyで継続")).toBeInTheDocument();
    expect(screen.getByText("degraded")).toBeInTheDocument();
  });

  test("shows stale tick warning while backend remains reachable", () => {
    useTraderSocketMock.mockReturnValue(
      buildState({
        connectionState: "stale",
        lastUpdatedAt: "2026-04-12T10:31:00"
      })
    );
    useTraderHealthMock.mockReturnValue(
      buildHealth({
        fetchState: "ready",
        snapshot: {
          status: "healthy",
          mode: "paper",
          orderMode: "stub_only",
          liveArmed: false,
          serverTime: "2026-04-13T10:31:30",
          lastPriceTickAt: "2026-04-13T10:31:00",
          lastPriceCode: "7203",
          aiStatus: "ready",
          referenceStatus: "ready",
          lastWarning: null
        }
      })
    );

    render(createElement(HomePage));

    expect(screen.getAllByText("価格更新が停滞").length).toBeGreaterThan(0);
  });

  test("shows backend unreachable warning", () => {
    useTraderSocketMock.mockReturnValue(buildState({ connectionState: "reconnecting" }));
    useTraderHealthMock.mockReturnValue(buildHealth({ fetchState: "unreachable" }));

    render(createElement(HomePage));

    expect(screen.getAllByText("backend 応答なし").length).toBeGreaterThan(0);
  });

  test("shows ai degraded warning", () => {
    useTraderSocketMock.mockReturnValue(buildState({ connectionState: "connected" }));
    useTraderHealthMock.mockReturnValue(
      buildHealth({
        fetchState: "ready",
        snapshot: {
          status: "degraded",
          mode: "paper",
          orderMode: "stub_only",
          liveArmed: false,
          serverTime: "2026-04-13T10:31:30",
          lastPriceTickAt: "2026-04-13T10:31:00",
          lastPriceCode: "7203",
          aiStatus: "degraded",
          referenceStatus: "ready",
          lastWarning: "AI判断エラー: GOOGLE_API_KEY not set"
        }
      })
    );

    render(createElement(HomePage));

    expect(screen.getAllByText("AI判断が劣化中").length).toBeGreaterThan(0);
  });

  test("shows live armed status when broker auto is active", () => {
    useTraderSocketMock.mockReturnValue(buildState({ connectionState: "connected" }));
    useTraderHealthMock.mockReturnValue(
      buildHealth({
        fetchState: "ready",
        snapshot: {
          status: "healthy",
          mode: "live",
          orderMode: "broker_auto",
          liveArmed: true,
          serverTime: "2026-04-13T10:31:30",
          lastPriceTickAt: "2026-04-13T10:31:00",
          lastPriceCode: "7203",
          aiStatus: "ready",
          referenceStatus: "ready",
          lastWarning: null
        }
      })
    );

    render(createElement(HomePage));

    expect(screen.getAllByText("live 設定 / 自動発注arm済み").length).toBeGreaterThan(0);
    expect(screen.getByText("live 発注条件成立")).toBeInTheDocument();
    expect(screen.getByText("broker auto / armed")).toBeInTheDocument();
    expect(screen.getByText("有効")).toBeInTheDocument();
  });
});
