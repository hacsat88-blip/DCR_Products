import { cleanup, render, screen } from "@testing-library/react";
import { createElement as h } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { ScoreRadar } from "../RadarChart";

afterEach(() => cleanup());

describe("ScoreRadar", () => {
  it("renders with default axes and aria-label", () => {
    const { container } = render(
      h(ScoreRadar, {
        values: { growth: 80, value: 60, profit: 70, safety: 50, momentum: 90 },
      }),
    );

    expect(screen.getByRole("img", { name: "スコアレーダーチャート" })).toBeInTheDocument();

    for (const label of ["成長性", "割安性", "収益性", "財務安全性", "モメンタム"]) {
      expect(container.textContent).toContain(label);
    }
  });

  it("clamps out-of-range values without throwing", () => {
    expect(() =>
      render(
        h(ScoreRadar, {
          values: { growth: 150, value: -20, profit: 50, safety: 50, momentum: 50 },
          compareValues: { growth: 10, value: 10, profit: 10, safety: 10, momentum: 10 },
        }),
      ),
    ).not.toThrow();
  });
});
