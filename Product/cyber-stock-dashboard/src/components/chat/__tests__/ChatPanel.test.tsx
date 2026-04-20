import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { ChatPanel } from "../ChatPanel";

function makeSseStream(events: string[]) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(c) {
      for (const e of events) {
        c.enqueue(encoder.encode(e));
        // tick
        await new Promise((r) => setTimeout(r, 0));
      }
      c.close();
    },
  });
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ChatPanel", () => {
  it("renders empty state and quick prompts", () => {
    render(<ChatPanel />);
    expect(screen.getByText(/質問を入力するか/)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /クイックプロンプト/ })).toBeInTheDocument();
  });

  it("submits a message and renders streamed assistant response", async () => {
    const stream = makeSseStream([
      `data: ${JSON.stringify({ delta: "こん" })}\n\n`,
      `data: ${JSON.stringify({ delta: "にちは" })}\n\n`,
      `data: ${JSON.stringify({ done: true })}\n\n`,
      `data: [DONE]\n\n`,
    ]);
    fetchMock.mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    render(<ChatPanel />);
    const input = screen.getByLabelText("質問入力") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "押し目?" } });
    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    await waitFor(() => {
      expect(screen.getByText("押し目?")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText("こんにちは")).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows error when API returns non-OK", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "rate_limited", message: "ng" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(<ChatPanel />);
    const input = screen.getByLabelText("質問入力");
    fireEvent.change(input, { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: /送信/ }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/ng/);
    });
  });

  it("shows friendly auth message from SSE error event", async () => {
    const stream = makeSseStream([
      `data: ${JSON.stringify({
        error: "llm_auth_failed",
        message:
          "AIチャットの認証に失敗しました。OpenRouter APIキーの無効・期限切れ、またはアカウント不一致の可能性があります。管理者設定を確認してください。",
      })}\n\n`,
      `data: [DONE]\n\n`,
    ]);
    fetchMock.mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );

    render(<ChatPanel />);
    const input = screen.getByLabelText("質問入力");
    fireEvent.change(input, { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/APIキー/);
    });
    expect(screen.getByRole("alert")).not.toHaveTextContent(/User not found/);
    expect(screen.getByRole("alert")).not.toHaveTextContent(/OpenRouter HTTP 401/);
  });

  it("supports cancel via AbortController", async () => {
    let abortFired = false;
    const longStream = new ReadableStream<Uint8Array>({
      async start(c) {
        const encoder = new TextEncoder();
        c.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: "途中" })}\n\n`));
        // never closes
      },
    });
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            abortFired = true;
            const err = new Error("aborted");
            (err as Error & { name: string }).name = "AbortError";
            reject(err);
          });
          // resolve immediately so reader can read partial
          resolve(
            new Response(longStream, {
              status: 200,
              headers: { "Content-Type": "text/event-stream" },
            }),
          );
        }),
    );

    render(<ChatPanel />);
    fireEvent.change(screen.getByLabelText("質問入力"), {
      target: { value: "test" },
    });
    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /キャンセル/ })).toBeInTheDocument();
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /キャンセル/ }));
    });
    expect(abortFired).toBe(true);
  });

  it("loads portfolio context for the portfolio preset before sending chat request", async () => {
    const stream = makeSseStream([
      `data: ${JSON.stringify({ delta: "承知しました" })}\n\n`,
      `data: ${JSON.stringify({ done: true })}\n\n`,
      `data: [DONE]\n\n`,
    ]);
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/portfolio") {
        return new Response(
          JSON.stringify({
            data: [
              {
                code: "7203",
                costJpy: 400000,
                pnlJpy: 100000,
                weightPercent: 62.5,
                marketValueJpy: 500000,
                currentPrice: 3000,
              },
              {
                code: "AAPL",
                costJpy: 330000,
                pnlJpy: -30000,
                weightPercent: 37.5,
                marketValueJpy: 300000,
                currentPrice: 190,
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url === "/api/chat") {
        const body = JSON.parse(init?.body as string);
        expect(body.context.portfolioSummary).toContain("7203 62.5%");
        expect(body.context.portfolioSummary).toContain("AAPL 37.5%");
        expect(body.context.portfolioSummary).toContain("評価損益");
        expect(body.context.tickers).toEqual(["7203", "AAPL"]);
        return new Response(stream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<ChatPanel enablePortfolioContext />);
    fireEvent.click(screen.getByRole("button", { name: /#ポートフォリオ評価/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/portfolio", expect.anything());
    });
    await waitFor(() => {
      expect(screen.getByText("承知しました")).toBeInTheDocument();
    });
  });

  it("sends webSearch opt-in when the search toggle is enabled", async () => {
    const stream = makeSseStream([
      `data: ${JSON.stringify({ delta: "最新情報を確認しました" })}\n\n`,
      `data: ${JSON.stringify({ done: true })}\n\n`,
      `data: [DONE]\n\n`,
    ]);
    fetchMock.mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string);
      expect(body.webSearch).toBe(true);
      return new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    });

    render(<ChatPanel showWebSearchToggle />);
    fireEvent.click(screen.getByRole("checkbox", { name: /web検索/i }));
    fireEvent.change(screen.getByLabelText("質問入力"), {
      target: { value: "今日の米国株ニュースは？" },
    });
    fireEvent.click(screen.getByRole("button", { name: /送信/ }));

    await waitFor(() => {
      expect(screen.getByText("最新情報を確認しました")).toBeInTheDocument();
    });
  });

  it("collapsible mode toggles content", () => {
    render(<ChatPanel collapsible defaultCollapsed />);
    expect(screen.queryByLabelText("質問入力")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /開く/ }));
    expect(screen.getByLabelText("質問入力")).toBeInTheDocument();
  });

  it("I13: shows character counter below input", () => {
    render(<ChatPanel />);
    const input = screen.getByLabelText("質問入力") as HTMLInputElement;
    
    expect(screen.getByText(/残り 2000 文字/i)).toBeInTheDocument();
    
    fireEvent.change(input, { target: { value: "a".repeat(1901) } });
    
    const counter = screen.getByText(/残り 99 文字/i);
    expect(counter).toBeInTheDocument();
  });
});
