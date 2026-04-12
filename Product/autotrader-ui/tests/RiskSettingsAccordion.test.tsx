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
  fireEvent.click(screen.getByRole("button", { name: "Risk Settings" }));
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

    expect(await screen.findByLabelText("limit_per_order")).toHaveValue(100000);
    expect(screen.getByLabelText("stop_loss_pct")).toHaveValue(3);
    expect(screen.getByLabelText("max_qty_per_order")).toHaveValue(100);
    expect(screen.getByLabelText("poll_interval_sec")).toHaveValue(5);
    expect(screen.getByLabelText("available_cash")).toHaveValue(290000);
    expect(screen.getByLabelText("manual_price_min")).toHaveValue(100);
    expect(screen.getByLabelText("manual_price_max")).toHaveValue(500);
    expect(screen.getByText("execution_feed")).toBeInTheDocument();
    expect(screen.getByText("rakuten_rss")).toBeInTheDocument();
    expect(screen.getByText("reference_feed")).toBeInTheDocument();
    expect(screen.getByText("jquants_light")).toBeInTheDocument();

    const aiMode = screen.getByLabelText("ai_mode") as HTMLSelectElement;
    expect(Array.from(aiMode.options).map((option) => option.value)).toEqual(["gemini", "hybrid"]);

    expect(screen.getAllByText("Auto")).toHaveLength(2);
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

    const cashInput = (await screen.findByLabelText("available_cash")) as HTMLInputElement;
    fireEvent.change(cashInput, { target: { value: "300000" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const request = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const payload = JSON.parse(String(request.body));

    expect(payload.available_cash).toBe(300000);
    expect(payload.ai_mode).toBe("gemini");
    expect(payload.execution_feed).toBe("rakuten_rss");
    expect(payload.reference_feed).toBe("jquants_light");
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

    await screen.findByLabelText("max_daily_orders");

    fireEvent.click(screen.getByRole("button", { name: "max_daily_orders Auto" }));
    fireEvent.click(screen.getByRole("button", { name: "max_concurrent_positions Auto" }));
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

    const cashInput = (await screen.findByLabelText("available_cash")) as HTMLInputElement;
    fireEvent.change(cashInput, { target: { value: "310000" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await screen.findByText("settings update failed");
    expect(screen.getByLabelText("available_cash")).toHaveValue(310000);
  });
});