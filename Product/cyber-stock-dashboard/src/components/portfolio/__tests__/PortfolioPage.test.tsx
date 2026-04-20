import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PortfolioPage from "@/app/portfolio/page";

const fetchMock = vi.fn();
const confirmMock = vi.fn();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function deferredJson(body: unknown) {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((r) => {
    resolve = r;
  });
  return {
    promise,
    resolve: () => resolve(jsonResponse(body)),
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <PortfolioPage />
    </QueryClientProvider>,
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("PortfolioPage auto lookup", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    confirmMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("confirm", confirmMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ignores stale lookup responses after the user edits the code again", async () => {
    const firstLookup = deferredJson({
      data: { name: "トヨタ自動車", currency: "JPY", sector: null },
    });

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/portfolio") {
        return Promise.resolve(jsonResponse({ data: [] }));
      }
      if (url === "/api/stocks/lookup?code=7203&market=JP") {
        return firstLookup.promise;
      }
      if (url === "/api/stocks/lookup?code=72035&market=JP") {
        return Promise.resolve(
          jsonResponse({
            data: { name: "新しい銘柄名", currency: "JPY", sector: null },
          }),
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    renderPage();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/portfolio");
    });

    const codeInput = screen.getByPlaceholderText("例: 7203 / NVDA");
    const nameInput = screen.getByPlaceholderText(
      "自動入力 or 手動入力",
    ) as HTMLInputElement;

    fireEvent.change(codeInput, { target: { value: "7203" } });
    await act(async () => {
      await sleep(650);
    });

    fireEvent.change(codeInput, { target: { value: "72035" } });
    await act(async () => {
      await sleep(650);
    });

    await waitFor(() => {
      expect(nameInput.value).toBe("新しい銘柄名");
    });

    await act(async () => {
      firstLookup.resolve();
      await Promise.resolve();
    });

    expect(nameInput.value).toBe("新しい銘柄名");
  });

  it("C1: shows success toast on portfolio add", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/portfolio" && init?.method === "POST") {
        return Promise.resolve(jsonResponse({}));
      }
      if (url === "/api/portfolio") {
        return Promise.resolve(jsonResponse({ data: [] }));
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    renderPage();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/portfolio"));

    const codeInput = screen.getByPlaceholderText("例: 7203 / NVDA") as HTMLInputElement;
    const nameInput = screen.getByPlaceholderText("自動入力 or 手動入力") as HTMLInputElement;
    const quantityInput = document.getElementById("quantity-input") as HTMLInputElement;
    const avgCostInput = document.getElementById("avg-cost-input") as HTMLInputElement;

    fireEvent.change(codeInput, { target: { value: "7203" } });
    fireEvent.change(nameInput, { target: { value: "トヨタ自動車" } });
    fireEvent.change(quantityInput, { target: { value: "100" } });
    fireEvent.change(avgCostInput, { target: { value: "2500" } });

    const submitButton = screen.getByText("追加 / 更新");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/銘柄を追加しました/i)).toBeInTheDocument();
    });
  });

  it("C4: form labels are properly associated with inputs", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/portfolio") {
        return Promise.resolve(jsonResponse({ data: [] }));
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    renderPage();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/portfolio"));

    const quantityInput = document.getElementById("quantity-input");
    const avgCostInput = document.getElementById("avg-cost-input");

    expect(quantityInput).toBeInTheDocument();
    expect(avgCostInput).toBeInTheDocument();
    expect(quantityInput?.getAttribute("type")).toBe("number");
    expect(avgCostInput?.getAttribute("type")).toBe("number");
  });

  it("I12: shows custom delete confirmation dialog instead of window.confirm", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/portfolio") {
        return Promise.resolve(
          jsonResponse({
            data: [
              {
                id: 1,
                code: "7203",
                market: "JP",
                name: "トヨタ自動車",
                quantity: 100,
                avgCost: 2500,
                currency: "JPY",
                marketValueJpy: 295000,
                costJpy: 250000,
                pnlJpy: 45000,
                pnlPercent: 18,
                weightPercent: 100,
                currentPrice: 2950,
              },
            ],
          }),
        );
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("トヨタ自動車")).toBeInTheDocument();
    });

    const deleteButton = screen.getByText("削除");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText("銘柄を削除")).toBeInTheDocument();
      expect(screen.getByText(/「トヨタ自動車」を削除してもよろしいですか？/i)).toBeInTheDocument();
    });

    expect(confirmMock).not.toHaveBeenCalled();
  });
});

