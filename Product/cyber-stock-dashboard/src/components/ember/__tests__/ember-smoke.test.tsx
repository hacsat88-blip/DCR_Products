import { describe, it, expect, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import { Card } from "../ui/Card";
import { Blob } from "../ui/Blob";
import { Stat } from "../ui/Stat";
import { SectorDot } from "../ui/SectorDot";
import { UpDown } from "../ui/UpDown";
import { Logo } from "../ui/Logo";
import { Tabs } from "../ui/Tabs";
import { SectionHead } from "../ui/SectionHead";
import { PriceChart } from "../charts/PriceChart";
import { ScatterPlot } from "../charts/ScatterPlot";
import { Sparkline } from "../charts/Sparkline";
import RankRow from "../composites/RankRow";
import NewsStack from "../composites/NewsStack";

describe("ember smoke", () => {
  beforeAll(() => {
    if (typeof globalThis.ResizeObserver === "undefined") {
      class RO {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
      (globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO;
    }
    if (typeof window !== "undefined" && !window.matchMedia) {
      window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })) as unknown as typeof window.matchMedia;
    }
  });
  it("Card renders children", () => {
    const { getByText } = render(<Card>hello</Card>);
    expect(getByText("hello")).toBeInTheDocument();
  });

  it("Card soft variant renders children", () => {
    const { getByText } = render(<Card soft>soft-card</Card>);
    expect(getByText("soft-card")).toBeInTheDocument();
  });

  it("Blob renders without crashing", () => {
    const { container } = render(
      <Blob color="coral" size={120} top="0%" left="0%" />,
    );
    expect(container.firstChild).not.toBeNull();
  });

  it("Stat renders label and value", () => {
    const { getByText } = render(<Stat label="Cash" value="¥1,000" />);
    expect(getByText(/Cash/i)).toBeInTheDocument();
    expect(getByText("¥1,000")).toBeInTheDocument();
  });

  it("SectorDot renders for any sector string", () => {
    const { container } = render(<SectorDot sector="Information Technology" />);
    expect(container.firstChild).not.toBeNull();
  });

  it("UpDown renders positive value", () => {
    const { container } = render(<UpDown value={1.23} />);
    expect(container.textContent).toMatch(/1\.23/);
  });

  it("UpDown renders negative value", () => {
    const { container } = render(<UpDown value={-2.5} />);
    expect(container.textContent).toMatch(/2\.5/);
  });

  it("Logo renders", () => {
    const { container } = render(<Logo />);
    expect(container.firstChild).not.toBeNull();
  });

  it("Tabs renders provided items", () => {
    const { getByText } = render(
      <Tabs
        tabs={[
          { id: "a", label: "Alpha" },
          { id: "b", label: "Beta" },
        ]}
        current="a"
        onChange={() => {}}
      />,
    );
    expect(getByText("Alpha")).toBeInTheDocument();
    expect(getByText("Beta")).toBeInTheDocument();
  });

  it("SectionHead renders title", () => {
    const { getByText } = render(<SectionHead title="Holdings" />);
    expect(getByText("Holdings")).toBeInTheDocument();
  });

  it("Sparkline accepts numeric series", () => {
    const { container } = render(<Sparkline data={[1, 2, 3, 4]} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("PriceChart accepts candle array", () => {
    const candles = Array.from({ length: 10 }, (_, i) => ({
      t: Date.now() + i * 86400000,
      o: 100 + i,
      h: 102 + i,
      l: 99 + i,
      c: 101 + i,
      v: 1000 + i,
    }));
    const { container } = render(<PriceChart candles={candles} />);
    expect(container.firstChild).not.toBeNull();
  });

  it("ScatterPlot renders with points", () => {
    const { container } = render(
      <ScatterPlot
        points={[
          { id: "1", label: "A", sector: "Tech", x: 1, y: 2, size: 10, total: 100 },
          { id: "2", label: "B", sector: "Tech", x: 3, y: 4, size: 12, total: 120 },
        ]}
        xAxis={{ id: "x", label: "X" }}
        yAxis={{ id: "y", label: "Y" }}
      />,
    );
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("RankRow renders rank and stock name", () => {
    const stock = {
      id: "1",
      ticker: "T",
      name: "Test Co",
      sector: "Tech",
      price: 100,
      change: 1,
      changePct: 1,
      currency: "JPY" as const,
    };
    const { getByText } = render(<RankRow rank={1} stock={stock} />);
    expect(getByText("Test Co")).toBeInTheDocument();
  });

  it("NewsStack renders provided items", () => {
    const items = [
      {
        id: "n1",
        title: "Headline One",
        source: "Test",
        url: "https://example.com/1",
        publishedAt: new Date().toISOString(),
        sentiment: "positive" as const,
      },
    ];
    const { getByText } = render(<NewsStack items={items} />);
    expect(getByText("Headline One")).toBeInTheDocument();
  });
});
