import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement as h } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SectorTreemap } from "../SectorTreemap";

afterEach(() => cleanup());

const CELLS = [
  { symbol: "AAA", sector: "Tech", marketCap: 1000, changePct: 2.5 },
  { symbol: "BBB", sector: "Tech", marketCap: 800, changePct: -1.2 },
  { symbol: "CCC", sector: "Health", marketCap: 600, changePct: 0.8 },
  { symbol: "DDD", sector: "Health", marketCap: 400, changePct: -3.1 },
];

describe("SectorTreemap", () => {
  it("renders a cell per symbol with symbol text visible", () => {
    render(h(SectorTreemap, { cells: CELLS, width: 400, height: 240 }));
    for (const c of CELLS) {
      expect(screen.getByTestId(`treemap-cell-${c.symbol}`)).toBeInTheDocument();
    }
  });

  it("calls onCellClick when a cell is clicked", () => {
    const onCellClick = vi.fn();
    render(
      h(SectorTreemap, {
        cells: CELLS,
        width: 400,
        height: 240,
        onCellClick,
      }),
    );

    fireEvent.click(screen.getByTestId("treemap-cell-AAA"));
    expect(onCellClick).toHaveBeenCalledWith("AAA");
  });

  it("renders fallback when cells is empty", () => {
    render(h(SectorTreemap, { cells: [] }));
    expect(screen.getByRole("img", { name: "セクターヒートマップ" })).toBeInTheDocument();
  });
});
