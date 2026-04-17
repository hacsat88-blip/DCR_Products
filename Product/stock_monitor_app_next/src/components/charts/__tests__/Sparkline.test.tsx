import { cleanup, render, screen } from "@testing-library/react";
import { createElement as h } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { Sparkline } from "../Sparkline";

afterEach(() => cleanup());

describe("Sparkline", () => {
  it("renders svg with path and min/max dots for values", () => {
    render(h(Sparkline, { values: [1, 5, 3, 8, 4], ariaLabel: "過去5日" }));
    const svg = screen.getByRole("img", { name: "過去5日" });
    expect(svg.tagName.toLowerCase()).toBe("svg");
    expect(svg.querySelector("path")).not.toBeNull();
    expect(screen.getByTestId("sparkline-min")).toBeInTheDocument();
    expect(screen.getByTestId("sparkline-max")).toBeInTheDocument();
  });

  it("shows em dash placeholder for empty values", () => {
    render(h(Sparkline, { values: [] }));
    const node = screen.getByTestId("sparkline-empty");
    expect(node.textContent).toBe("—");
    expect(node.getAttribute("role")).toBe("img");
  });

  it("handles flat series without throwing", () => {
    expect(() =>
      render(h(Sparkline, { values: [5, 5, 5, 5] })),
    ).not.toThrow();
    expect(screen.getByTestId("sparkline-svg")).toBeInTheDocument();
  });

  it("respects custom width and height", () => {
    render(h(Sparkline, { values: [1, 2, 3], width: 200, height: 60 }));
    const svg = screen.getByTestId("sparkline-svg");
    expect(svg.getAttribute("width")).toBe("200");
    expect(svg.getAttribute("height")).toBe("60");
  });
});
