import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PickCard from "../composites/PickCard";
import type { StockSummary } from "../composites/types";

const stock: StockSummary = {
  id: "AAPL",
  ticker: "AAPL",
  name: "Apple Inc.",
  nameJp: "アップル",
  sector: "Information Technology",
  price: 215.5,
  change: 2.3,
  changePct: 1.08,
  currency: "USD",
  spark: [210, 212, 214, 215.5],
  totalScore: 82,
};

describe("PickCard", () => {
  it("renders name, ticker, sector and JP name", () => {
    render(<PickCard stock={stock} />);
    expect(screen.getByText("Apple Inc.")).toBeInTheDocument();
    // ticker appears on both front and back, sector also appears on both
    expect(screen.getAllByText("AAPL").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Information Technology").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("アップル")).toBeInTheDocument();
  });

  it("renders score with aria-label", () => {
    render(<PickCard stock={stock} />);
    expect(screen.getByLabelText("スコア 82")).toBeInTheDocument();
  });

  it("renders reason text when provided", () => {
    render(<PickCard stock={stock} reason="サプライチェーン回復" />);
    // reason appears on front (clamped) and back (rationale)
    expect(screen.getAllByText("サプライチェーン回復").length).toBeGreaterThanOrEqual(1);
  });

  it("calls onSelect with stock id on click", () => {
    const onSelect = vi.fn();
    render(<PickCard stock={stock} onSelect={onSelect} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Apple Inc. (AAPL) を選択、スコア 82 点" }),
    );
    expect(onSelect).toHaveBeenCalledWith("AAPL");
  });

  it("formats USD price with $ prefix", () => {
    render(<PickCard stock={stock} />);
    expect(screen.getByText(/\$215\.5/)).toBeInTheDocument();
  });

  it("has aria-label with name, ticker and score", () => {
    render(<PickCard stock={stock} />);
    expect(
      screen.getByRole("button", {
        name: "Apple Inc. (AAPL) を選択、スコア 82 点",
      }),
    ).toBeInTheDocument();
  });

  it("includes score in aria-label even when score is 0", () => {
    render(<PickCard stock={{ ...stock, totalScore: 0 }} />);
    expect(
      screen.getByRole("button", {
        name: "Apple Inc. (AAPL) を選択、スコア 0 点",
      }),
    ).toBeInTheDocument();
  });
});
