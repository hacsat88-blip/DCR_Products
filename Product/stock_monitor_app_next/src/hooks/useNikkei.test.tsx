import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useNikkei } from "./useNikkei";

describe("useNikkei", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("skips fetching when disabled for externally controlled refresh flows", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    const { result } = renderHook(() => useNikkei("2024-01-05T00:00:00Z", "1mo", { enabled: false }));

    await waitFor(() => {
      expect(result.current).toEqual({
        latestClose: null,
        diff: null,
        diffPercent: null,
        sourceLabel: null,
        history: []
      });
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still fetches market index data by default", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        latestClose: 38_123.45,
        diff: 123.45,
        diffPercent: 0.32,
        sourceTimestamp: "2024-01-05T00:00:00Z",
        sourceLabel: "YF",
        history: [{ date: "2024-01-05", close: 38_123.45 }]
      })
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const { result } = renderHook(() => useNikkei("2024-01-05T00:00:00Z", "1mo"));

    await waitFor(() => {
      expect(result.current).toEqual({
        latestClose: 38_123.45,
        diff: 123.45,
        diffPercent: 0.32,
        sourceLabel: "実測終値 (2024-01-05)",
        history: [{ date: "2024-01-05", close: 38_123.45 }]
      });
    });
  });
});
