import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { GlobalTabs } from "@/components/navigation/GlobalTabs";

const mockUsePathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

describe("GlobalTabs", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/");
  });

  it("renders common page tabs", () => {
    render(<GlobalTabs />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Analyze" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Portfolio" })).toBeInTheDocument();
  });

  it("marks current top-level tab as active", () => {
    mockUsePathname.mockReturnValue("/portfolio");
    render(<GlobalTabs />);
    expect(screen.getByRole("link", { name: "Portfolio" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("adds and highlights stock tab on stock detail path", () => {
    mockUsePathname.mockReturnValue("/stocks/7203");
    render(<GlobalTabs />);
    expect(screen.getByRole("link", { name: "Stock" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
