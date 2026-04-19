import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import HomePage from "@/app/page";

vi.mock("@/components/dashboard", () => ({
  DashboardHeader: () => <div>DashboardHeader</div>,
  IndicesGrid: () => <div>IndicesGrid</div>,
  NewsTiles: () => <div>NewsTiles</div>,
  PicksCarousel: () => <div>PicksCarousel</div>,
  PortfolioSummary: () => <div>PortfolioSummary</div>,
}));

vi.mock("@/components/charts", () => ({
  PortfolioValueChart: () => <div>PortfolioValueChart</div>,
  PortfolioCompositionChart: () => <div>PortfolioCompositionChart</div>,
}));

vi.mock("@/components/ui", () => ({
  Disclaimer: () => <div>Disclaimer</div>,
  ScanLines: () => null,
}));

const fetchMock = vi.fn();

const portfolioRows = [
  {
    id: 1,
    code: "7203",
    market: "JP",
    name: "Toyota",
    quantity: 100,
    avgCost: 2500,
    currency: "JPY",
    note: null,
    currentPrice: 3000,
    priceCurrency: "JPY",
    fxRate: 1,
    marketValueJpy: 300_000,
    costJpy: 250_000,
    pnlJpy: 50_000,
    pnlPercent: 20,
    weightPercent: 60,
  },
];

describe("HomePage portfolio-aware chat", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows portfolio-aware quick prompt hint when holdings exist", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: portfolioRows }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(await HomePage());

    await waitFor(() => {
      expect(screen.getByText("ポートフォリオ文脈を自動添付中")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "開く" }));
    expect(
      screen.getByRole("button", { name: /ポートフォリオ評価（保有反映）/ }),
    ).toBeInTheDocument();
  });

  it("shows explicit empty-state hint when no holdings exist", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(await HomePage());

    await waitFor(() => {
      expect(
        screen.getByText("ポートフォリオ未登録のため一般情報として回答します"),
      ).toBeInTheDocument();
    });
  });
});
