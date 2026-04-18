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

  it("collapsible mode toggles content", () => {
    render(<ChatPanel collapsible defaultCollapsed />);
    expect(screen.queryByLabelText("質問入力")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /開く/ }));
    expect(screen.getByLabelText("質問入力")).toBeInTheDocument();
  });
});
