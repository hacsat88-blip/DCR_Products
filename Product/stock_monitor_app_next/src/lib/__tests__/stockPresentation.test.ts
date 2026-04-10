import { describe, expect, it } from "vitest";

import {
  addToCompareSelection,
  canSelectForCompare,
  COMPARE_SELECTION_LIMIT,
  formatStockMarketCapDisplay,
  getRemoveStockAriaLabel,
  getRemoveStockConfirmMessage,
  getStockInsightText,
  getStockOverviewText,
  getStockNarrativeSummaryText
} from "@/lib/stockPresentation";

describe("stockPresentation narrative helpers", () => {
  it("prefers company overview text for API-added stocks", () => {
    const stock = {
      id: "live-9999",
      oneLiner: "テストHDは半導体向けの検査装置を展開しています。",
      summary: "テストHDは半導体検査装置を主力とし、国内外の設備投資を取り込む構図です。"
    };

    expect(getStockOverviewText(stock)).toBe(stock.oneLiner);
    expect(getStockInsightText(stock)).toBe(stock.oneLiner);
  });

  it("uses the longer summary for narrative sections", () => {
    const stock = {
      id: "live-7777",
      oneLiner: "説明銘柄は法人向けSaaS企業です。",
      summary: "説明銘柄は法人向けSaaSを主力とし、継続課金モデルで収益を積み上げています。"
    };

    expect(getStockNarrativeSummaryText(stock)).toBe(stock.summary);
  });

  it("falls back to summary when the overview text is blank", () => {
    const stock = {
      id: "live-5555",
      oneLiner: "   ",
      summary: "空欄時は和文サマリーを利用します。"
    };

    expect(getStockOverviewText(stock)).toBe(stock.summary);
    expect(getStockInsightText(stock)).toBe(stock.summary);
  });

  it("builds a consistent delete confirmation message", () => {
    const stock = {
      id: "live-4477",
      code: "4477",
      name: "BASE"
    };

    expect(getRemoveStockConfirmMessage(stock)).toBe(
      "BASE（4477）を削除しますか？監視・比較・保有数・詳細メモは削除されます。履歴スナップショットは保持されます。"
    );
  });

  it("builds an accessible delete button label with stock context", () => {
    const stock = {
      id: "live-4477",
      code: "4477",
      name: "BASE"
    };

    expect(getRemoveStockAriaLabel(stock)).toBe("BASE（4477）を削除");
  });

  it("keeps market-cap pending copy only for fallback stocks still waiting on fundamentals", () => {
    expect(
      formatStockMarketCapDisplay({
        id: "live-6666",
        marketCap: 0,
        fundamentalsSourceLabel: "M"
      })
    ).toBe("時価総額取得待ち");

    expect(
      formatStockMarketCapDisplay({
        id: "live-6666",
        marketCap: 0,
        fundamentalsSourceLabel: "AV"
      })
    ).toBe("0億円");
  });

  it("prevents adding a 5th compare item and keeps existing selection", () => {
    const current = ["9424", "2337", "4477", "4419"];
    const next = addToCompareSelection(current, "8306");

    expect(next).toEqual(current);
  });

  it("keeps compare action disabled only for unselected stocks when slots are full", () => {
    const full = ["9424", "2337", "4477", "4419"];

    expect(COMPARE_SELECTION_LIMIT).toBe(4);
    expect(canSelectForCompare(full, "8306")).toBe(false);
    expect(canSelectForCompare(full, "9424")).toBe(true);
  });
});
