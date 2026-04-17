import { cleanup, render, screen } from "@testing-library/react";
import { createElement as h } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { CorrelationHeatmap } from "../CorrelationHeatmap";

afterEach(() => cleanup());

describe("CorrelationHeatmap", () => {
  it("renders label x label cells including diagonal 1.00", () => {
    render(
      h(CorrelationHeatmap, {
        labels: ["AAA", "BBB"],
        matrix: [
          [1, 0.5],
          [0.5, 1],
        ],
      }),
    );
    expect(screen.getByTestId("corr-AAA-AAA").textContent).toBe("1.00");
    expect(screen.getByTestId("corr-AAA-BBB").textContent).toBe("0.50");
    expect(screen.getByTestId("corr-BBB-BBB").textContent).toBe("1.00");
  });

  it("renders em dash for NaN correlation cells", () => {
    render(
      h(CorrelationHeatmap, {
        labels: ["A", "B"],
        matrix: [
          [1, NaN],
          [NaN, 1],
        ],
      }),
    );
    expect(screen.getByTestId("corr-A-B").textContent).toBe("—");
    expect(screen.getByTestId("corr-B-A").textContent).toBe("—");
  });
});
