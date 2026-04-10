import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveNikkeiDataStatus, useNikkeiOhlc } from "./useNikkeiOhlc";

describe("useNikkeiOhlc", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to Alpha Vantage when Yahoo intraday data is unavailable", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ohlc: [],
          error: "Yahoo intraday unavailable",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          source: "alpha_vantage",
          sourceTimestamp: "2024-01-15T01:10:00Z",
          sourceLabel: "AV",
          ohlc: [
            {
              date: "2024-01-15T01:05:00Z",
              time: 1_705_280_700,
              open: 38_050,
              high: 38_120,
              low: 38_040,
              close: 38_100,
              volume: 1_000,
            },
            {
              date: "2024-01-15T01:10:00Z",
              time: 1_705_281_000,
              open: 38_100,
              high: 38_140,
              low: 38_080,
              close: 38_120,
              volume: 1_100,
            },
          ],
        }),
      });

    globalThis.fetch = fetchMock as typeof fetch;

    const { result } = renderHook(() =>
      useNikkeiOhlc("5m", { now: new Date("2024-01-15T01:15:00Z") })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/market-index?");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/api/market-index-intraday?");
    expect(result.current.source).toBe("alpha_vantage");
    expect(result.current.dataStatus).toBe("fallback");
    expect(result.current.latestClose).toBe(38_120);
    expect(result.current.diff).toBe(20);
    expect(result.current.diffPercent).toBeCloseTo((20 / 38_100) * 100, 6);
  });

  it("skips fetching when disabled", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;

    const { result } = renderHook(() => useNikkeiOhlc("1d", { enabled: false }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.ohlc).toEqual([]);
  });

  it("classifies fresh trading-hour data as live", () => {
    const status = resolveNikkeiDataStatus(
      "2024-01-15T01:10:00Z",
      "morning",
      false,
      new Date("2024-01-15T01:15:00Z")
    );

    expect(status).toBe("live");
  });

  it("keeps source and freshness state consistent when payload reports alpha fallback", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        source: "alpha_vantage",
        sourceTimestamp: "2024-01-15T01:10:00Z",
        ohlc: [
          {
            date: "2024-01-15T01:05:00Z",
            time: 1_705_280_700,
            open: 38_050,
            high: 38_120,
            low: 38_040,
            close: 38_100,
            volume: 1_000,
          },
          {
            date: "2024-01-15T01:10:00Z",
            time: 1_705_281_000,
            open: 38_100,
            high: 38_140,
            low: 38_080,
            close: 38_120,
            volume: 1_100,
          },
        ],
      }),
    });

    globalThis.fetch = fetchMock as typeof fetch;

    const { result } = renderHook(() =>
      useNikkeiOhlc("5m", { now: new Date("2024-01-15T01:15:00Z") })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.source).toBe("alpha_vantage");
    expect(result.current.dataStatus).toBe("fallback");
  });
});
