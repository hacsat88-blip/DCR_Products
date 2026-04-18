import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

const mockUsePathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

// fetch を一律スタブ
beforeEach(() => {
  mockUsePathname.mockReturnValue("/");
  global.fetch = vi.fn(async () =>
    new Response(
      JSON.stringify({
        signal: "🟢",
        level: "normal",
        badge: "go",
        reasons: ["ok"],
        recommendedAction: "monitor",
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
  ) as unknown as typeof fetch;
});

function withClient(children: React.ReactNode) {
  const c = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={c}>{children}</QueryClientProvider>;
}

describe("DashboardHeader", () => {
  it("renders nav and title", () => {
    render(withClient(<DashboardHeader />));
    expect(screen.getByText(/Cyber Stock Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Analyze")).toBeInTheDocument();
    expect(screen.getByText("Portfolio")).toBeInTheDocument();
  });
});
