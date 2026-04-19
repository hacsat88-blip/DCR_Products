import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Chip } from "../ui/Chip";

describe("Chip", () => {
  it("renders children", () => {
    render(<Chip>Beta</Chip>);
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("uses default tone background when tone not specified", () => {
    render(<Chip>Default</Chip>);
    const el = screen.getByText("Default");
    expect(el.style.background).toContain("var(--bg-2)");
  });

  it("uses coral tone color", () => {
    render(<Chip tone="coral">Alert</Chip>);
    const el = screen.getByText("Alert");
    expect(el.style.color).toContain("var(--coral-deep)");
  });

  it.each([
    ["plum", "var(--plum)"],
    ["sage", "var(--sage)"],
    ["clay", "var(--clay)"],
  ] as const)("applies %s tone color", (tone, expected) => {
    render(<Chip tone={tone}>{tone}</Chip>);
    const el = screen.getByText(tone);
    expect(el.style.color).toContain(expected);
  });
});
