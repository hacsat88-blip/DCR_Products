import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement as h } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { SparklineTooltip } from "../SparklineTooltip";

afterEach(() => cleanup());

describe("SparklineTooltip", () => {
  it("shows tooltip on hover with aria-hidden=false", () => {
    render(
      h(
        SparklineTooltip,
        {
          values: [1, 2, 3, 4, 5],
          change30dPct: 4.2,
          label: "過去30日",
        },
        h("span", null, "AAPL"),
      ),
    );

    expect(screen.queryByRole("tooltip")).toBeNull();

    fireEvent.mouseEnter(screen.getByTestId("sparkline-tip-trigger"));
    const tip = screen.getByRole("tooltip");
    expect(tip).toBeInTheDocument();
    expect(tip.getAttribute("aria-hidden")).toBe("false");
    expect(screen.getByTestId("sparkline-tip-change").textContent).toContain("+4.20%");
  });

  it("opens on focus and closes on blur (keyboard)", () => {
    render(
      h(
        SparklineTooltip,
        { values: [5, 3, 2], change30dPct: -1.5 },
        h("span", null, "SYM"),
      ),
    );
    const trigger = screen.getByTestId("sparkline-tip-trigger");

    fireEvent.focus(trigger);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    expect(screen.getByTestId("sparkline-tip-change").textContent).toContain("-1.50%");

    fireEvent.blur(trigger);
    // After blur, AnimatePresence may still have it; query defensively
    const tip = screen.queryByRole("tooltip");
    // Either unmounted or aria-hidden=false would still be visible; only accept unmount for closed state
    expect(tip).toBeNull();
  });
});
