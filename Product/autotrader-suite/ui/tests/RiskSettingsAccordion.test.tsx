import { createElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { RiskSettingsAccordion } from "@/components/RiskSettingsAccordion";
import type { RiskSettingsResponse } from "@/types/trader";

const fetchMock = vi.fn<typeof fetch>();

const BASE_SETTINGS: RiskSettingsResponse = {
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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function openAccordion(): void {
  fireEvent.click(screen.getByRole("button", { name: "リスク設定" }));
}

afterEach(() => {
  fetchMock.mockReset();
});

vi.stubGlobal("fetch", fetchMock);

describe("RiskSettingsAccordion", () => {
  test("loads settings via GET and renders effective values", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(BASE_SETTINGS));

    render(createElement(RiskSettingsAccordion));
    openAccordion();

    expect(await screen.findByLabelText("1回あたり上限金額")).toHaveValue(100000);
    expect(screen.getByLabelText("損切り率 (%)")).toHaveValue(3);
    expect(screen.getByLabelText("1回あたり最大数量")).toHaveValue(100);
    expect(screen.getByLabelText("送信間隔 (秒)")).toHaveValue(5);
    expect(screen.getByLabelText("利用可能現金")).toHaveValue(290000);
    expect(screen.getByLabelText("手動価格帯 下限")).toHaveValue(100);
    expect(screen.getByLabelText("手動価格帯 上限")).toHaveValue(500);
    expect(screen.getByLabelText("日次損失上限 (円)")).toHaveValue(15000);
    expect(screen.getByLabelText("最大連敗数")).toHaveValue(2);
    expect(screen.getByLabelText("損失後クールダウン (分)")).toHaveValue(15);
    expect(screen.getByLabelText("最小5本レンジ (%)")).toHaveValue(0.8);
    expect(screen.getByLabelText("直近出来高倍率")).toHaveValue(1.2);
    expect(screen.getByLabelText("参照乖離上限 (%)")).toHaveValue(4);
    expect(screen.getByLabelText("引け前手仕舞い (分前)")).toHaveValue(10);
    expect(screen.getByLabelText("最大スプレッド (bps)")).toHaveValue(20);
    expect(screen.getByLabelText("寄り付き停止 (分)")).toHaveValue(5);
    expect(screen.getByText("執行フィード")).toBeInTheDocument();
    expect(screen.getByText("楽天RSS")).toBeInTheDocument();
    expect(screen.getByText("参照フィード")).toBeInTheDocument();
    expect(screen.getByText("J-Quants Light")).toBeInTheDocument();

    const aiMode = screen.getByLabelText("AI モード") as HTMLSelectElement;
    expect(Array.from(aiMode.options).map((option) => option.value)).toEqual(["gemini"]);
    expect(Array.from(aiMode.options).map((option) => option.text)).toEqual(["Gemini"]);
    expect(aiMode).toBeDisabled();

    const tradeMode = screen.getByLabelText("売買モード") as HTMLSelectElement;
    expect(Array.from(tradeMode.options).map((option) => option.value)).toEqual([
      "conservative",
      "balanced",
      "aggressive"
    ]);
    expect(Array.from(tradeMode.options).map((option) => option.text)).toEqual(["慎重", "標準", "積極"]);

    expect(screen.getAllByText("自動")).toHaveLength(2);
    expect(screen.getByText("実効値 3")).toBeInTheDocument();
    expect(screen.getByText("実効値 1")).toBeInTheDocument();
  });

  test("sends full payload on PUT and preserves hidden fields", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(BASE_SETTINGS)).mockResolvedValueOnce(
      jsonResponse({
        ...BASE_SETTINGS,
        available_cash: 300000
      })
    );

    render(createElement(RiskSettingsAccordion));
    openAccordion();

    const cashInput = (await screen.findByLabelText("利用可能現金")) as HTMLInputElement;
    fireEvent.change(cashInput, { target: { value: "300000" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const request = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const payload = JSON.parse(String(request.body));

    expect(payload.available_cash).toBe(300000);
    expect(payload.ai_mode).toBe("gemini");
    expect(payload.execution_feed).toBe("rakuten_rss");
    expect(payload.reference_feed).toBe("jquants_light");
    expect(payload.max_daily_loss_yen).toBe(15000);
    expect(payload.max_consecutive_losses).toBe(2);
    expect(payload.cooldown_minutes_after_loss).toBe(15);
    expect(payload.min_five_bar_range_pct).toBe(0.8);
    expect(payload.min_last_bar_volume_ratio).toBe(1.2);
    expect(payload.max_reference_gap_pct).toBe(4);
    expect(payload.flat_before_close_minutes).toBe(10);
    expect(payload.max_spread_bps).toBe(20);
    expect(payload.skip_open_minutes).toBe(5);
  });

  test("auto mode sends null for nullable overrides", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ...BASE_SETTINGS,
        max_daily_orders: 7,
        max_concurrent_positions: 2,
        effective_max_daily_orders: 7,
        effective_max_concurrent_positions: 2
      })
    ).mockResolvedValueOnce(jsonResponse(BASE_SETTINGS));

    render(createElement(RiskSettingsAccordion));
    openAccordion();

    await screen.findByLabelText("1日あたり最大注文数");

    fireEvent.click(screen.getByRole("button", { name: "1日あたり最大注文数 自動" }));
    fireEvent.click(screen.getByRole("button", { name: "同時保有上限 自動" }));
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const request = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const payload = JSON.parse(String(request.body));

    expect(payload.max_daily_orders).toBeNull();
    expect(payload.max_concurrent_positions).toBeNull();
  });

  test("keeps draft values when PUT fails", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(BASE_SETTINGS)).mockResolvedValueOnce(
      jsonResponse({ detail: "failed" }, 500)
    );

    render(createElement(RiskSettingsAccordion));
    openAccordion();

    const cashInput = (await screen.findByLabelText("利用可能現金")) as HTMLInputElement;
    fireEvent.change(cashInput, { target: { value: "310000" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await screen.findByText("設定の更新に失敗しました");
    expect(screen.getByLabelText("利用可能現金")).toHaveValue(310000);
  });

  test("disables form actions when initial GET fails", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "failed" }, 500));

    render(createElement(RiskSettingsAccordion));
    openAccordion();

    await screen.findByText("設定の取得に失敗しました");
    expect(screen.getByRole("button", { name: "保存" })).toBeDisabled();
  });
});