import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement as h } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FlipCard } from "../FlipCard";

afterEach(() => cleanup());

describe("FlipCard", () => {
  it("shows front initially and toggles via button", () => {
    const onFlip = vi.fn();
    render(
      h(FlipCard, {
        front: h("div", null, "FRONT_VIEW"),
        back: h("div", null, "BACK_VIEW"),
        onFlip,
        ariaLabelFront: "運用ビュー",
        ariaLabelBack: "監査ビュー",
      }),
    );

    expect(screen.getByText("FRONT_VIEW")).toBeInTheDocument();
    expect(screen.getByText("BACK_VIEW")).toBeInTheDocument();

    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(btn);
    expect(onFlip).toHaveBeenCalledWith(true);
    expect(btn).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(btn);
    expect(onFlip).toHaveBeenLastCalledWith(false);
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  it("respects defaultFlipped=true", () => {
    render(
      h(FlipCard, {
        front: h("div", null, "F"),
        back: h("div", null, "B"),
        defaultFlipped: true,
      }),
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("syncs aria-pressed with controlled flipped prop", () => {
    const { rerender } = render(
      h(FlipCard, {
        front: h("div", null, "F"),
        back: h("div", null, "B"),
        flipped: false,
      }),
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
    rerender(
      h(FlipCard, {
        front: h("div", null, "F"),
        back: h("div", null, "B"),
        flipped: true,
      }),
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });
});
