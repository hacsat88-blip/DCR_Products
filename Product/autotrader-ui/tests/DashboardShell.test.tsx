import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import HomePage from "@/app/page";
import type { TraderEventSnapshot, TraderViewModel } from "@/types/trader";

const useTraderSocketMock = vi.fn<() => TraderViewModel>();

vi.mock("@/hooks/useTraderSocket", () => ({
  useTraderSocket: (): TraderViewModel => useTraderSocketMock()
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

afterEach(() => {
  useTraderSocketMock.mockReset();
});

describe("HomePage dashboard shell", () => {
  test("shows waiting-first-tick empty state", () => {
    useTraderSocketMock.mockReturnValue(buildState());

    render(createElement(HomePage));

    expect(screen.getByRole("heading", { name: "AutoTrader ダッシュボード" })).toBeInTheDocument();
    expect(screen.getAllByText("初回待機")).toHaveLength(2);
    expect(screen.getByText("監視コンソール")).toBeInTheDocument();
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

    render(createElement(HomePage));

    expect(screen.getByText("執行 / 楽天RSS")).toBeInTheDocument();
    expect(screen.getByText("参照価格 ¥251.00")).toBeInTheDocument();
    expect(screen.getByText("参照 / J-Quants Free")).toBeInTheDocument();
    expect(screen.getByText("J-Quants 参照更新")).toBeInTheDocument();
    expect(screen.getByText(/^見送り$/)).toBeInTheDocument();
    expect(screen.getByText("注文イベントなし")).toBeInTheDocument();
  });
});
