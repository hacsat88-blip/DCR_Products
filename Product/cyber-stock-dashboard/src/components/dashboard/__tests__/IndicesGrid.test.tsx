import { describe, it, expect, vi, beforeEach } from "vitest";
import * as React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { IndexResult } from "@/lib/services/marketIndices";
import { IndicesGrid } from "../IndicesGrid";

vi.mock("../IndexChart", () => ({
  IndexChart: ({ data }: { data: unknown[] }) => (
    <div data-testid="index-chart" data-points={data.length} />
  ),
}));

const mockedFetch = vi.fn();

function withClient(children: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function mockIndicesResponse(items: IndexResult[]) {
  mockedFetch.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        items,
        range: "daily",
        asOf: "2025-06-02T00:00:00.000Z",
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    ),
  );
}

describe("IndicesGrid", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
    global.fetch = mockedFetch as unknown as typeof fetch;
  });

  it("keeps chart visible with warning and retry when fallback data exists", async () => {
    mockIndicesResponse([
      {
        id: "DJI",
        label: "NY ダウ",
        symbol: "^DJI",
        source: "alphaVantage",
        proxySymbol: "DIA",
        currency: "USD",
        status: "ok",
        fallbackReason:
          "Alpha Vantage failed: free key rate limit (25 requests per day)",
        data: [
          {
            date: "2025-05-29",
            open: 39000,
            high: 39100,
            low: 38950,
            close: 39020,
            volume: 0,
          },
          {
            date: "2025-05-30",
            open: 39020,
            high: 39200,
            low: 39010,
            close: 39120,
            volume: 0,
          },
        ],
        latest: {
          date: "2025-05-30",
          close: 39120,
          change: 100,
          changePercent: 0.256,
        },
        range: "daily",
      },
    ]);

    render(withClient(<IndicesGrid />));

    expect(await screen.findByText("NY ダウ")).toBeInTheDocument();
    expect(screen.getByTestId("index-chart")).toBeInTheDocument();
    expect(
      screen.getByText(/フォールバックデータを表示中/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "再試行" })).toBeInTheDocument();
    expect(screen.queryByText("データ取得失敗")).toBeNull();
  });

  it("shows hard error state when no fallback data exists", async () => {
    mockIndicesResponse([
      {
        id: "SPX",
        label: "S&P 500",
        symbol: "^GSPC",
        source: "alphaVantage",
        proxySymbol: "SPY",
        currency: "USD",
        status: "error",
        fallbackReason:
          "Alpha Vantage failed: free key rate limit (25 requests per day)",
        data: [],
        range: "daily",
      },
    ]);

    render(withClient(<IndicesGrid />));

    expect(await screen.findByText("S&P 500")).toBeInTheDocument();
    expect(screen.getByText("データ取得失敗")).toBeInTheDocument();
    expect(screen.queryByTestId("index-chart")).toBeNull();
  });
});
