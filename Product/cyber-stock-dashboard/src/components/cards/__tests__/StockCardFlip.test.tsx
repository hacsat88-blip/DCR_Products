import { describe, it, expect, vi, beforeEach } from "vitest";
import * as React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import type {
  AuditData,
  OperationData,
} from "../types";

vi.mock("../Sparkline", () => ({
  Sparkline: () => <div data-testid="sparkline-mock" />,
}));

vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 400, height: 300 }}>
        {/* fixed-size shim so SVG renders in jsdom */}
        {React.cloneElement(
          children as React.ReactElement<{ width?: number; height?: number }>,
          { width: 400, height: 300 },
        )}
      </div>
    ),
  };
});

const reducedMotionRef = { value: false };

vi.mock("framer-motion", async () => {
  const React = await import("react");
  type DivProps = React.HTMLAttributes<HTMLDivElement> & {
    children?: React.ReactNode;
  };
  const passthrough = ({ children, ...rest }: DivProps) => (
    <div {...rest}>{children}</div>
  );
  return {
    motion: { div: passthrough },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    useReducedMotion: () => reducedMotionRef.value,
  };
});

import { StockCardFlip } from "../StockCardFlip";
import { RadarScore } from "../RadarScore";

const operation: OperationData = {
  price: 100,
  change: 1.2,
  changePercent: 1.2,
  currency: "USD",
  pnl: 50,
  holdingQty: 10,
  unrealizedPnl: 25,
};

const audit: AuditData = {
  scores: {
    movement: 70,
    volume: 60,
    catalyst: 55,
    fundamental: 80,
    risk: 65,
  },
  scenarios: { short: "上値追い", mid: "横ばい", long: "成長継続" },
  risks: ["金利上昇", "競合激化"],
  signal: "go",
};

describe("StockCardFlip", () => {
  beforeEach(() => {
    reducedMotionRef.value = false;
  });

  it("renders default operation face", () => {
    render(
      <StockCardFlip
        symbol="AAPL"
        market="US"
        name="Apple"
        operation={operation}
        audit={audit}
      />,
    );
    expect(screen.getByText("Apple")).toBeInTheDocument();
    const btn = screen.getByRole("button", { name: /AAPL を監査面に切替/ });
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("toggles face on FLIP click", () => {
    const onToggle = vi.fn();
    render(
      <StockCardFlip
        symbol="AAPL"
        market="US"
        name="Apple"
        operation={operation}
        audit={audit}
        onToggle={onToggle}
      />,
    );
    const btn = screen.getByRole("button", { name: /AAPL を監査面に切替/ });
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledWith("audit");
    const after = screen.getByRole("button", { name: /AAPL を運用面に切替/ });
    expect(after).toHaveAttribute("aria-pressed", "true");
  });

  it("uses fade fallback when prefers-reduced-motion", () => {
    reducedMotionRef.value = true;
    render(
      <StockCardFlip
        symbol="AAPL"
        market="US"
        name="Apple"
        operation={operation}
        audit={audit}
      />,
    );
    expect(screen.getByTestId("card-fade-face")).toBeInTheDocument();
    expect(screen.queryByTestId("card-flip-inner")).toBeNull();
  });
});

describe("RadarScore", () => {
  it("renders 5 axis labels", () => {
    const { container } = render(
      <RadarScore
        scores={{
          movement: 50,
          volume: 50,
          catalyst: 50,
          fundamental: 50,
          risk: 50,
        }}
      />,
    );
    const text = container.textContent ?? "";
    for (const label of [
      "値動き余地",
      "出来高",
      "材料",
      "ファンダ",
      "リスク耐性",
    ]) {
      expect(text).toContain(label);
    }
  });
});
