import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import BacktestPage from "../page";
import { BACKTEST_STORAGE_KEY, useBacktestStore } from "@/store/useBacktestStore";

// Recharts needs measurable width/height under jsdom.
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 600, height: 300 }} data-testid="responsive-container">
        {children}
      </div>
    ),
  };
});

const originalFetch = globalThis.fetch;

beforeEach(() => {
  useBacktestStore.setState({ history: [] }, false);
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(BACKTEST_STORAGE_KEY);
  }
});

afterEach(() => {
  cleanup();
  useBacktestStore.setState({ history: [] }, false);
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("BacktestPage", () => {
  it("初期表示で『サンプルデータで実行』ボタンを表示", () => {
    render(<BacktestPage />);
    expect(screen.getByRole("button", { name: "サンプルデータで実行" })).toBeInTheDocument();
  });

  it("サンプルデータ実行で equity / KPI / trade row が描画される", () => {
    render(<BacktestPage />);
    fireEvent.click(screen.getByRole("button", { name: "サンプルデータで実行" }));
    expect(screen.getByTestId("backtest-equity-chart")).toBeInTheDocument();
    expect(screen.getByTestId("backtest-kpi")).toBeInTheDocument();
    const rows = screen.queryAllByTestId("backtest-trade-row");
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it("戦略切替で param フォームが変わる", () => {
    render(<BacktestPage />);
    // default = sma_cross → fast param exists
    expect(screen.getByLabelText("param-fast")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("strategy"), {
      target: { value: "rsi_reversion" },
    });
    expect(screen.getByLabelText("param-period")).toBeInTheDocument();
    expect(screen.queryByLabelText("param-fast")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("strategy"), {
      target: { value: "buy_and_hold" },
    });
    expect(screen.queryByLabelText("param-period")).not.toBeInTheDocument();
  });

  it("AI 解釈ボタンで fetch が呼ばれ drawer に summary が表示", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          summary: "テスト用解釈",
          strengths: ["s1"],
          weaknesses: ["w1"],
          improvementIdeas: ["i1"],
          riskNotes: ["r1"],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    ) as unknown as typeof fetch;

    render(<BacktestPage />);
    fireEvent.click(screen.getByRole("button", { name: "サンプルデータで実行" }));
    fireEvent.click(screen.getByRole("button", { name: "AI 解釈 (Deep)" }));

    await waitFor(() => {
      expect(screen.getByTestId("ai-summary")).toHaveTextContent("テスト用解釈");
    });
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });
});
