import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useStockStore } from "@/store/useStockStore";

import { useMarketData } from "./useMarketData";

describe("useMarketData", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    useStockStore.setState(useStockStore.getInitialState(), true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses an injected polling controller instead of hard-coding window.setInterval", async () => {
    const refreshStocks = vi.fn().mockResolvedValue(undefined);
    const stopPolling = vi.fn();
    let scheduledTask: (() => void) | null = null;
    const schedule = vi.fn((task: () => void, intervalMs: number) => {
      scheduledTask = task;
      expect(intervalMs).toBe(1_234);
      return stopPolling;
    });

    useStockStore.setState({
      ...useStockStore.getInitialState(),
      registeredCodes: ["9424"],
      dataMode: "live",
      refreshStocks
    });

    const { unmount } = renderHook(() =>
      useMarketData({
        enabled: true,
        refreshIntervalMs: 1_234,
        polling: {
          mode: "interval",
          controller: { schedule }
        }
      })
    );

    await waitFor(() => expect(refreshStocks).toHaveBeenCalledTimes(1));
    expect(schedule).toHaveBeenCalledTimes(1);

    act(() => {
      scheduledTask?.();
    });

    await waitFor(() => expect(refreshStocks).toHaveBeenCalledTimes(2));

    unmount();

    expect(stopPolling).toHaveBeenCalledTimes(1);
  });

  it("supports manual polling mode without registering an interval", async () => {
    const refreshStocks = vi.fn().mockResolvedValue(undefined);
    const schedule = vi.fn();

    useStockStore.setState({
      ...useStockStore.getInitialState(),
      registeredCodes: ["9424"],
      dataMode: "live",
      refreshStocks
    });

    renderHook(() =>
      useMarketData({
        enabled: true,
        polling: {
          mode: "manual",
          controller: { schedule }
        }
      })
    );

    await waitFor(() => expect(refreshStocks).toHaveBeenCalledTimes(1));
    expect(schedule).not.toHaveBeenCalled();
  });
});
