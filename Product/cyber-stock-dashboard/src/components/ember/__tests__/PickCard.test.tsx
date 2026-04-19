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
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("Information Technology")).toBeInTheDocument();
    expect(screen.getByText("アップル")).toBeInTheDocument();
  });

  it("renders score with aria-label", () => {
    render(<PickCard stock={stock} />);
    expect(screen.getByLabelText("スコア 82")).toBeInTheDocument();
  });

  it("renders reason text when provided", () => {
    render(<PickCard stock={stock} reason="サプライチェーン回復" />);
    expect(screen.getByText("サプライチェーン回復")).toBeInTheDocument();
  });

  it("calls onSelect with stock id on click", () => {
    const onSelect = vi.fn();
    render(<PickCard stock={stock} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith("AAPL");
  });

  it("formats USD price with $ prefix", () => {
    render(<PickCard stock={stock} />);
    expect(screen.getByText(/\$215\.5/)).toBeInTheDocument();
  });
});
