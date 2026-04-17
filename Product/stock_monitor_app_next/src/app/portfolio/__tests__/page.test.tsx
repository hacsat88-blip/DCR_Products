import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import PortfolioPage from "../page";
import { HOLDINGS_STORAGE_KEY, useHoldingsStore } from "@/store/useHoldingsStore";

beforeEach(() => {
  useHoldingsStore.setState({ holdings: [] }, false);
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(HOLDINGS_STORAGE_KEY);
  }
});

afterEach(() => {
  cleanup();
  useHoldingsStore.setState({ holdings: [] }, false);
});

function fillAndAdd(opts: {
  symbol: string;
  quantity: string;
  averageCost: string;
  acquiredAt: string;
  market?: "JP" | "US";
  sector?: string;
}): void {
  fireEvent.change(screen.getByLabelText("銘柄コード"), { target: { value: opts.symbol } });
  if (opts.market) {
    fireEvent.change(screen.getByLabelText("市場"), { target: { value: opts.market } });
  }
  fireEvent.change(screen.getByLabelText("保有数量"), { target: { value: opts.quantity } });
  fireEvent.change(screen.getByLabelText("平均取得単価"), {
    target: { value: opts.averageCost },
  });
  fireEvent.change(screen.getByLabelText("取得日"), { target: { value: opts.acquiredAt } });
  if (opts.sector) {
    fireEvent.change(screen.getByLabelText("セクター"), { target: { value: opts.sector } });
  }
  fireEvent.click(screen.getByRole("button", { name: "追加" }));
}

describe("PortfolioPage", () => {
  it("初期表示で empty state を示す", () => {
    render(<PortfolioPage />);
    expect(screen.getByText("保有銘柄はまだ登録されていません")).toBeInTheDocument();
  });

  it("フォームで追加すると table に行が追加される", () => {
    render(<PortfolioPage />);
    fillAndAdd({
      symbol: "7203",
      market: "JP",
      quantity: "100",
      averageCost: "2500",
      acquiredAt: "2024-01-10",
    });
    const cells = screen.getAllByText("7203");
    expect(cells.length).toBeGreaterThan(0);
    expect(
      screen.queryByText("保有銘柄はまだ登録されていません"),
    ).not.toBeInTheDocument();
  });

  it("行の削除ボタンで行が消える", () => {
    render(<PortfolioPage />);
    fillAndAdd({
      symbol: "9984",
      quantity: "50",
      averageCost: "6000",
      acquiredAt: "2024-02-01",
    });
    const delBtn = screen.getByRole("button", { name: "9984 を削除" });
    fireEvent.click(delBtn);
    expect(screen.getByText("保有銘柄はまだ登録されていません")).toBeInTheDocument();
  });

  it("複数追加で総取得額 KPI が合計値を表示する", () => {
    render(<PortfolioPage />);
    fillAndAdd({
      symbol: "7203",
      quantity: "100",
      averageCost: "2500",
      acquiredAt: "2024-01-10",
    });
    fillAndAdd({
      symbol: "9984",
      quantity: "50",
      averageCost: "6000",
      acquiredAt: "2024-02-01",
    });
    // 100*2500 + 50*6000 = 250,000 + 300,000 = 550,000
    const kpi = screen.getByTestId("kpi-総取得額");
    expect(kpi.textContent).toMatch(/550,000/);
  });

  it("バリデーションエラーを表示する（quantity=0）", () => {
    render(<PortfolioPage />);
    fillAndAdd({
      symbol: "AAPL",
      quantity: "0",
      averageCost: "180",
      acquiredAt: "2024-03-01",
    });
    expect(screen.getByRole("alert").textContent).toMatch(/quantity/);
    // 行は追加されていない
    expect(screen.getByText("保有銘柄はまだ登録されていません")).toBeInTheDocument();
  });

  it("現在評価額は未連携のため '—' を表示する", () => {
    render(<PortfolioPage />);
    const kpi = screen.getByTestId("kpi-現在評価額");
    expect(kpi.textContent).toBe("—");
  });
});
