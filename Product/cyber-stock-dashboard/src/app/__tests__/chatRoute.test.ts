import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const streamMock = vi.fn();
const nonStreamMock = vi.fn();

vi.mock("@/lib/llm/router", () => ({
  chatWithHistory: (...args: unknown[]) => nonStreamMock(...args),
  chatWithHistoryStream: (...args: unknown[]) => streamMock(...args),
}));

import { POST } from "@/app/api/chat/route";
import { resetRateLimit } from "@/lib/rateLimitMemory";
import { LLMError } from "@/lib/llm/openrouterClient";

const ORIG_KEY = process.env.OPENROUTER_API_KEY;

function makeReq(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function readSse(res: Response): Promise<string[]> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const chunks: string[] = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
  }
  for (const part of buf.split("\n\n")) {
    const t = part.trim();
    if (t.startsWith("data:")) chunks.push(t.slice(5).trim());
  }
  return chunks;
}

describe("/api/chat route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit("chat");
    process.env.OPENROUTER_API_KEY = "test-key";
  });
  afterEach(() => {
    if (ORIG_KEY === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = ORIG_KEY;
  });

  it("returns 503 friendly message when OPENROUTER_API_KEY is unset", async () => {
    delete process.env.OPENROUTER_API_KEY;
    const res = await POST(
      makeReq({ messages: [{ role: "user", content: "hi" }] }),
    );
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("llm_unconfigured");
    expect(body.message).toContain("LLM");
  });

  it("treats blank OPENROUTER_API_KEY as unconfigured", async () => {
    process.env.OPENROUTER_API_KEY = '   ""   ';
    const res = await POST(
      makeReq({ messages: [{ role: "user", content: "hi" }] }),
    );
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe("llm_unconfigured");
    expect(streamMock).not.toHaveBeenCalled();
    expect(nonStreamMock).not.toHaveBeenCalled();
  });

  it("validates request body", async () => {
    const res = await POST(makeReq({ messages: [] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("validation_error");
  });

  it("streams SSE chunks from chatWithHistoryStream", async () => {
    streamMock.mockImplementation(async function* () {
      yield "こん";
      yield "にちは";
    });
    const res = await POST(
      makeReq({ messages: [{ role: "user", content: "test" }] }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const chunks = await readSse(res);
    expect(chunks).toContain(JSON.stringify({ delta: "こん" }));
    expect(chunks).toContain(JSON.stringify({ delta: "にちは" }));
    // disclaimer footer & done & DONE
    expect(chunks.some((c) => c.includes("参考情報"))).toBe(true);
    expect(chunks.some((c) => c.includes('"done":true'))).toBe(true);
    expect(chunks).toContain("[DONE]");
  });

  it("falls back to non-stream when streaming throws before any token", async () => {
    streamMock.mockImplementation(async function* () {
      throw new Error("stream boom");
    });
    nonStreamMock.mockResolvedValue("フォールバック応答");

    const res = await POST(
      makeReq({ messages: [{ role: "user", content: "test" }] }),
    );
    expect(res.status).toBe(200);
    const chunks = await readSse(res);
    expect(chunks.some((c) => c.includes("フォールバック応答"))).toBe(true);
    expect(chunks.some((c) => c.includes('"fallback":true'))).toBe(true);
    expect(nonStreamMock).toHaveBeenCalledTimes(1);
  });

  it("injects context prefix into first user message", async () => {
    let capturedHistory: unknown = null;
    streamMock.mockImplementation(async function* (history: unknown) {
      capturedHistory = history;
      yield "ok";
    });
    await POST(
      makeReq({
        messages: [{ role: "user", content: "押し目?" }],
        context: { tickers: ["7203"], sector: "自動車" },
      }),
    );
    const arr = capturedHistory as { role: string; content: string }[];
    expect(arr[0].content).toContain("[対象:");
    expect(arr[0].content).toContain("7203");
    expect(arr[0].content).toContain("自動車");
    expect(arr[0].content).toContain("押し目?");
  });

  it("rate limits after 10 requests from same IP", async () => {
    streamMock.mockImplementation(async function* () {
      yield "ok";
    });
    const headers = { "x-forwarded-for": "1.2.3.4" };
    for (let i = 0; i < 10; i++) {
      const res = await POST(
        makeReq({ messages: [{ role: "user", content: "x" }] }, headers),
      );
      // drain stream so it doesn't hold open
      await readSse(res);
      expect(res.status).toBe(200);
    }
    const blocked = await POST(
      makeReq({ messages: [{ role: "user", content: "x" }] }, headers),
    );
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.error).toBe("rate_limited");
  });

  it("non-stream mode returns JSON content with footer", async () => {
    nonStreamMock.mockResolvedValue("回答本文");
    const res = await POST(
      makeReq({
        messages: [{ role: "user", content: "test" }],
        stream: false,
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.content).toContain("回答本文");
    expect(body.content).toContain("参考情報");
  });

  it("maps OpenRouter auth failure to 401 with friendly message (non-stream)", async () => {
    nonStreamMock.mockRejectedValue(
      new LLMError(
        "auth",
        'OpenRouter HTTP 401: {"error":{"message":"User not found.","code":401}}',
        { status: 401 },
      ),
    );
    const res = await POST(
      makeReq({
        messages: [{ role: "user", content: "test" }],
        stream: false,
      }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("llm_auth_failed");
    expect(body.message).toContain("APIキー");
    expect(body.message).toContain("アカウント");
    expect(body.message).not.toContain("User not found");
    expect(body.message).not.toContain("OpenRouter HTTP 401");
  });

  it("does not leak provider payload in streaming fallback auth error", async () => {
    const authErr = new LLMError(
      "auth",
      'OpenRouter HTTP 401: {"error":{"message":"User not found.","code":401}}',
      { status: 401 },
    );
    streamMock.mockImplementation(async function* () {
      throw authErr;
    });
    nonStreamMock.mockRejectedValue(authErr);

    const res = await POST(
      makeReq({ messages: [{ role: "user", content: "test" }] }),
    );
    expect(res.status).toBe(200);
    const chunks = await readSse(res);
    const joined = chunks.join("\n");
    expect(joined).toContain('"error":"llm_auth_failed"');
    expect(joined).toContain("APIキー");
    expect(joined).toContain("アカウント");
    expect(joined).not.toContain("User not found");
    expect(joined).not.toContain("OpenRouter HTTP 401");
    expect(nonStreamMock).toHaveBeenCalledTimes(1);
  });
});
