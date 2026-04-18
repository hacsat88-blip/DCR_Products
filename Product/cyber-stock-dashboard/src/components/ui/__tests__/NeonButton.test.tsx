import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NeonButton } from "../NeonButton";

describe("NeonButton", () => {
  it("renders with default primary/md variants", () => {
    render(<NeonButton>Run</NeonButton>);
    const btn = screen.getByRole("button", { name: /run/i });
    expect(btn).toHaveAttribute("data-variant", "primary");
    expect(btn).toHaveAttribute("data-size", "md");
    expect(btn).not.toBeDisabled();
  });

  it("applies the danger variant classes", () => {
    render(<NeonButton variant="danger">Stop</NeonButton>);
    const btn = screen.getByRole("button", { name: /stop/i });
    expect(btn).toHaveAttribute("data-variant", "danger");
    expect(btn.className).toMatch(/border-alert/);
  });

  it("disables and marks aria-busy when isLoading", () => {
    render(<NeonButton isLoading>Loading</NeonButton>);
    const btn = screen.getByRole("button", { name: /loading/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
  });
});
