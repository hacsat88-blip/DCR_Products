import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import EtfPage from "@/app/etf/page";

describe("EtfPage", () => {
  it("初期レンダリングで JP タブの 1306 が表示される", () => {
    render(<EtfPage />);
    expect(screen.getByTestId("etf-row-1306")).toBeInTheDocument();
  });

  it("US タブに切替えると SPY が表示される", () => {
    render(<EtfPage />);
    fireEvent.click(screen.getByRole("tab", { name: "米国株タブ" }));
    expect(screen.getByTestId("etf-row-SPY")).toBeInTheDocument();
    expect(screen.queryByTestId("etf-row-1306")).toBeNull();
  });

  it("検索で SPY のみが残る", () => {
    render(<EtfPage />);
    fireEvent.click(screen.getByRole("tab", { name: "米国株タブ" }));
    const search = screen.getByLabelText("ETF検索") as HTMLInputElement;
    fireEvent.change(search, { target: { value: "SPY" } });
    expect(screen.getByTestId("etf-row-SPY")).toBeInTheDocument();
    expect(screen.queryByTestId("etf-row-VOO")).toBeNull();
    expect(screen.queryByTestId("etf-row-1306")).toBeNull();
  });

  it("カテゴリフィルタで Bond のみに絞り込める", () => {
    render(<EtfPage />);
    fireEvent.click(screen.getByRole("tab", { name: "米国株タブ" }));
    fireEvent.click(screen.getByRole("button", { name: "カテゴリ: Bond" }));
    expect(screen.getByTestId("etf-row-AGG")).toBeInTheDocument();
    expect(screen.queryByTestId("etf-row-SPY")).toBeNull();
  });

  it("行クリックで詳細ダイアログが開く", () => {
    render(<EtfPage />);
    fireEvent.click(screen.getByTestId("etf-row-1306"));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAccessibleName(/1306 詳細/);
    expect(dialog).toHaveTextContent(/expenseRatio/);
  });
});
