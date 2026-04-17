import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement as h } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AiExplainProvider, useAiExplain } from "../AiExplainDrawer";

function Trigger({ label = "PER" }: { label?: string }): JSX.Element {
  const { explain } = useAiExplain();
  return h(
    "button",
    {
      type: "button",
      onClick: () => {
        void explain({ label, value: 15.2, symbol: "7203" });
      },
    },
    "open",
  );
}

function mockFetchOnce(
  ok: boolean,
  body: Record<string, unknown>,
  status = 200,
): void {
  const resp = {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
  (globalThis as { fetch: unknown }).fetch = vi.fn().mockResolvedValue(resp);
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  cleanup();
  (globalThis as { fetch: typeof fetch }).fetch = originalFetch;
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AiExplainDrawer", () => {
  it("opens drawer and renders explanation on successful fetch", async () => {
    mockFetchOnce(true, { explanation: "PER は株価収益率です。" });

    render(
      h(
        AiExplainProvider,
        null,
        h(Trigger, null),
      ),
    );

    expect(screen.queryByTestId("ai-explain-drawer")).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByText("open"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("ai-explain-body").textContent).toContain(
        "PER は株価収益率です。",
      );
    });
    const drawer = screen.getByTestId("ai-explain-drawer");
    expect(drawer.getAttribute("aria-modal")).toBe("true");
  });

  it("shows error message when fetch returns non-ok", async () => {
    mockFetchOnce(false, { error: "rate_limited" }, 429);

    render(h(AiExplainProvider, null, h(Trigger, null)));
    await act(async () => {
      fireEvent.click(screen.getByText("open"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("ai-explain-error").textContent).toContain(
        "rate_limited",
      );
    });
  });

  it("closes on Escape key", async () => {
    mockFetchOnce(true, { explanation: "ok" });

    render(h(AiExplainProvider, null, h(Trigger, null)));
    await act(async () => {
      fireEvent.click(screen.getByText("open"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("ai-explain-drawer")).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByTestId("ai-explain-drawer")).toBeNull();
    });
  });
});
