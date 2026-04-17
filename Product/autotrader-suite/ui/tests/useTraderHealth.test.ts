import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { HEALTH_POLL_MS } from "@/lib/constants";
import { useTraderHealth } from "@/hooks/useTraderHealth";

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

describe("useTraderHealth", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("loads health snapshot and marks state ready", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        status: "healthy",
        mode: "paper",
        order_mode: "stub_only",
        server_time: "2026-04-13T10:30:05",
        last_price_tick_at: "2026-04-13T10:30:00",
        last_price_code: "7203",
        ai_status: "ready",
        reference_status: "ready",
        last_warning: null
      })
    );

    const { result } = renderHook(() => useTraderHealth());

    await waitFor(() => {
      expect(result.current.fetchState).toBe("ready");
    });

    expect(result.current.snapshot?.mode).toBe("paper");
    expect(result.current.snapshot?.liveArmed).toBe(false);
    expect(result.current.snapshot?.lastPriceCode).toBe("7203");
  });

  test("accepts live broker health payload when armed", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        status: "healthy",
        mode: "live",
        order_mode: "broker_auto",
        live_armed: true,
        server_time: "2026-04-13T10:30:05",
        last_price_tick_at: "2026-04-13T10:30:00",
        last_price_code: "7203",
        ai_status: "ready",
        reference_status: "ready",
        last_warning: null
      })
    );

    const { result } = renderHook(() => useTraderHealth());

    await waitFor(() => {
      expect(result.current.fetchState).toBe("ready");
    });

    expect(result.current.snapshot?.mode).toBe("live");
    expect(result.current.snapshot?.orderMode).toBe("broker_auto");
    expect(result.current.snapshot?.liveArmed).toBe(true);
  });

  test("marks health unreachable on proxy failure", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: "health proxy failed" }, 502));

    const { result } = renderHook(() => useTraderHealth());

    await waitFor(() => {
      expect(result.current.fetchState).toBe("unreachable");
    });
  });

  test("preserves degraded snapshot when reference is stale", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        status: "degraded",
        mode: "paper",
        order_mode: "stub_only",
        server_time: "2026-04-13T10:30:05",
        last_price_tick_at: "2026-04-13T10:30:00",
        last_price_code: "7203",
        ai_status: "ready",
        reference_status: "degraded",
        last_warning: "J-Quants reference stale (11 days); execution onlyで継続"
      })
    );

    const { result } = renderHook(() => useTraderHealth());

    await waitFor(() => {
      expect(result.current.fetchState).toBe("ready");
    });

    expect(result.current.snapshot?.status).toBe("degraded");
    expect(result.current.snapshot?.referenceStatus).toBe("degraded");
    expect(result.current.snapshot?.lastWarning).toContain("reference stale");
  });

  test("polls health endpoint every 10 seconds", async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValue(
      jsonResponse({
        status: "healthy",
        mode: "paper",
        order_mode: "stub_only",
        server_time: "2026-04-13T10:30:05",
        last_price_tick_at: null,
        last_price_code: null,
        ai_status: "ready",
        reference_status: "degraded",
        last_warning: "J-Quants reference missing; execution onlyで継続"
      })
    );

    renderHook(() => useTraderHealth());

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(HEALTH_POLL_MS);
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});