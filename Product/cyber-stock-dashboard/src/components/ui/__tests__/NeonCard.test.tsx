import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NeonCard } from "../NeonCard";

describe("NeonCard", () => {
  it("renders children with default subtle glow", () => {
    render(<NeonCard>Hello</NeonCard>);
    const el = screen.getByText("Hello");
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute("data-glow", "subtle");
  });

  it("applies the alert glow variant", () => {
    render(<NeonCard glow="alert">Warn</NeonCard>);
    const el = screen.getByText("Warn");
    expect(el).toHaveAttribute("data-glow", "alert");
    expect(el.className).toMatch(/border-alert/);
  });

  it("supports rendering as a different element via `as` prop", () => {
    render(
      <NeonCard as="section" glow="strong" data-testid="card">
        Section
      </NeonCard>,
    );
    const el = screen.getByTestId("card");
    expect(el.tagName).toBe("SECTION");
    expect(el).toHaveAttribute("data-glow", "strong");
  });
});
