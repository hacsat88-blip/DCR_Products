import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataFreshnessBadge } from "./DataFreshnessBadge";

describe("DataFreshnessBadge", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders stable SSR markup regardless of current time", () => {
    const timestamp = "2026-04-08T08:00:00.000Z";
    const dateNow = vi.spyOn(Date, "now");

    dateNow.mockReturnValue(Date.parse("2026-04-08T08:05:00.000Z"));
    const earlyMarkup = renderToString(createElement(DataFreshnessBadge, { kind: "price", timestamp }));

    dateNow.mockReturnValue(Date.parse("2026-04-08T10:05:00.000Z"));
    const lateMarkup = renderToString(createElement(DataFreshnessBadge, { kind: "price", timestamp }));

    expect(earlyMarkup).toBe(lateMarkup);
  });

  it("keeps hydration-safe fallback markup even when locale formatting differs", () => {
    const timestamp = "2026-04-08T08:00:00.000Z";
    vi.spyOn(Date.prototype, "toLocaleString")
      .mockReturnValueOnce("SSR_TIME")
      .mockReturnValue("CSR_TIME");

    const ssrMarkup = renderToString(createElement(DataFreshnessBadge, { kind: "price", timestamp }));
    const clientInitialMarkup = renderToString(createElement(DataFreshnessBadge, { kind: "price", timestamp }));

    expect(ssrMarkup).toContain("価格 更新済み");
    expect(ssrMarkup).toBe(clientInitialMarkup);
  });

  it("shows a relative freshness label after mount", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-04-08T08:05:00.000Z"));

    render(createElement(DataFreshnessBadge, { kind: "price", timestamp: "2026-04-08T08:00:00.000Z" }));

    await waitFor(() => {
      expect(screen.getByText("価格 5分前")).toBeInTheDocument();
    });
  });

});
