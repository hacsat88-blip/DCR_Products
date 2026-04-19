import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HoldingRow from "../composites/HoldingRow";
import type { Holding } from "../composites/types";

const baseHolding: Holding = {
  id: "h1",
  ticker: "7203",
  name: "Toyota",
  sector: "Consumer Discretionary",
  price: 3200,
  change: 50,
  changePct: 1.5,
  currency: "JPY",
  spark: [3100, 3120, 3150, 3200],
  quantity: 100,
  cost: 300000,
  marketValue: 320000,
  pl: 20000,
  plPct: 6.67,
  weight: 0.25,
};

describe("HoldingRow", () => {
  it("renders name, ticker and quantity", () => {
    render(<HoldingRow holding={baseHolding} />);
    expect(screen.getByText("Toyota")).toBeInTheDocument();
    expect(screen.getByText("7203")).toBeInTheDocument();
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });

  it("derives unit cost as cost/quantity", () => {
    render(<HoldingRow holding={baseHolding} />);
    expect(screen.getByText("¥3,000")).toBeInTheDocument();
  });

  it("formats USD with two decimals", () => {
    render(
      <HoldingRow
        holding={{
          ...baseHolding,
          currency: "USD",
          price: 100.5,
          cost: 95,
          quantity: 1,
          marketValue: 100.5,
          pl: 5.5,
        }}
      />,
    );
    expect(screen.getByText("$95.00")).toBeInTheDocument();
    expect(screen.getAllByText("$100.50").length).toBeGreaterThan(0);
  });

  it("clamps weight to 0–1 and renders percentage", () => {
    render(<HoldingRow holding={{ ...baseHolding, weight: 1.5 }} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("invokes onSelect on click and Enter", () => {
    const onSelect = vi.fn();
    render(<HoldingRow holding={baseHolding} onSelect={onSelect} />);
    const row = screen.getByRole("row");
    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith("h1");
    fireEvent.keyDown(row, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(2);
  });
});
