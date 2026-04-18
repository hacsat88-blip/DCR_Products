import { describe, it, expect, vi, beforeEach } from "vitest";
import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const setData = vi.fn();
const remove = vi.fn();
const fitContent = vi.fn();
const addCandlestickSeries = vi.fn(() => ({ setData }));
const createChart = vi.fn(() => ({
  addCandlestickSeries,
  remove,
  resize: vi.fn(),
  timeScale: () => ({ fitContent }),
}));

vi.mock("lightweight-charts", () => ({
  createChart,
  CandlestickSeries: { name: "Candlestick" },
}));

import { CandleChart, aggregateWeekly } from "../CandleChart";
import type { Candle } from "@/lib/providers/types";

const SAMPLE: Candle[] = Array.from({ length: 14 }, (_, i) => {
  const day = String(i + 1).padStart(2, "0");
  return {
    date: `2025-01-${day}`,
    open: 100 + i,
    high: 102 + i,
    low: 99 + i,
    close: 101 + i,
    volume: 1000 + i,
  };
});

describe("CandleChart", () => {
  beforeEach(() => {
    setData.mockClear();
    remove.mockClear();
    addCandlestickSeries.mockClear();
    createChart.mockClear();
    fitContent.mockClear();
  });

  it("renders toggle and container", () => {
    render(<CandleChart data={SAMPLE} />);
    expect(screen.getByTestId("candle-chart")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "日足" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "週足" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("loads chart and calls setData with candles", async () => {
    render(<CandleChart data={SAMPLE} />);
    await waitFor(() => expect(createChart).toHaveBeenCalled());
    await waitFor(() => expect(setData).toHaveBeenCalled());
    const passed = setData.mock.calls[0][0] as Array<{ time: string }>;
    expect(passed.length).toBe(SAMPLE.length);
    expect(passed[0]).toMatchObject({ time: "2025-01-01" });
  });

  it("switches to weekly aggregation", async () => {
    render(<CandleChart data={SAMPLE} />);
    await waitFor(() => expect(setData).toHaveBeenCalled());
    setData.mockClear();
    fireEvent.click(screen.getByRole("tab", { name: "週足" }));
    await waitFor(() => expect(setData).toHaveBeenCalled());
    const passed = setData.mock.calls[0][0] as Array<{ time: string }>;
    expect(passed.length).toBeLessThan(SAMPLE.length);
    expect(passed.length).toBeGreaterThan(0);
  });

  it("renders NO DATA when empty", () => {
    render(<CandleChart data={[]} />);
    expect(screen.getByText("NO DATA")).toBeInTheDocument();
  });
});

describe("aggregateWeekly", () => {
  it("groups daily candles by ISO week", () => {
    const weekly = aggregateWeekly(SAMPLE);
    expect(weekly.length).toBeGreaterThan(0);
    expect(weekly.length).toBeLessThan(SAMPLE.length);
    for (const c of weekly) {
      expect(c.high).toBeGreaterThanOrEqual(c.low);
    }
  });
  it("returns [] for empty input", () => {
    expect(aggregateWeekly([])).toEqual([]);
  });
});
