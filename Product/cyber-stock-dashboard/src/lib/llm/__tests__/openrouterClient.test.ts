import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { chat, LLMError } from "../openrouterClient";

function makeResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

function makeChatBody(content: string) {
  return { choices: [{ message: { content } }] };
}

const baseOpts = {
  model: "test/model",
  apiKey: "sk-test",
  sleepImpl: () => Promise.resolve(),
  messages: [{ role: "user" as const, content: "hi" }],
};

describe("openrouterClient.chat", () => {
  it("returns string content on success without responseFormat", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      makeResponse(makeChatBody("hello world")),
    );
    const result = await chat({ ...baseOpts, fetchImpl });
    expect(result).toBe("hello world");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const call = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(call[0]).toBe("https://openrouter.ai/api/v1/chat/completions");
    const init = call[1];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer sk-test");
  });

  it("retries on 429 then succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(makeResponse({ error: "rl" }, { status: 429 }))
      .mockResolvedValueOnce(makeResponse({ error: "rl" }, { status: 429 }))
      .mockResolvedValueOnce(makeResponse(makeChatBody("ok")));
    const result = await chat({
      ...baseOpts,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toBe("ok");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("throws auth LLMError on 401 without retrying", async () => {
    const fetchImpl = vi.fn(async () =>
      makeResponse({ error: "no" }, { status: 401 }),
    );
    await expect(
      chat({ ...baseOpts, fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toMatchObject({ name: "LLMError", kind: "auth" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("throws rate_limit after exhausting retries", async () => {
    const fetchImpl = vi.fn(async () =>
      makeResponse({ error: "rl" }, { status: 429 }),
    );
    await expect(
      chat({
        ...baseOpts,
        fetchImpl: fetchImpl as unknown as typeof fetch,
        maxRetries: 2,
      }),
    ).rejects.toMatchObject({ name: "LLMError", kind: "rate_limit" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("parses JSON via Zod when responseFormat is provided", async () => {
    const Schema = z.object({ foo: z.string(), n: z.number() });
    const payload = JSON.stringify({ foo: "bar", n: 7 });
    const fetchImpl = vi.fn(async () => makeResponse(makeChatBody(payload)));
    const result = await chat({
      ...baseOpts,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      responseFormat: { schema: Schema },
    });
    expect(result).toEqual({ foo: "bar", n: 7 });
  });

  it("throws invalid_response when Zod parse fails", async () => {
    const Schema = z.object({ foo: z.string() });
    const payload = JSON.stringify({ foo: 123 });
    const fetchImpl = vi.fn(async () => makeResponse(makeChatBody(payload)));
    await expect(
      chat({
        ...baseOpts,
        fetchImpl: fetchImpl as unknown as typeof fetch,
        responseFormat: { schema: Schema },
      }),
    ).rejects.toMatchObject({ name: "LLMError", kind: "invalid_response" });
  });

  it("throws invalid_response when content is not JSON in JSON mode", async () => {
    const Schema = z.object({ foo: z.string() });
    const fetchImpl = vi.fn(async () => makeResponse(makeChatBody("not json!")));
    await expect(
      chat({
        ...baseOpts,
        fetchImpl: fetchImpl as unknown as typeof fetch,
        responseFormat: { schema: Schema },
      }),
    ).rejects.toBeInstanceOf(LLMError);
  });

  it("throws auth when apiKey missing", async () => {
    const prev = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    try {
      await expect(
        chat({
          model: "x",
          messages: [{ role: "user", content: "x" }],
          fetchImpl: (async () => makeResponse(makeChatBody("x"))) as unknown as typeof fetch,
        }),
      ).rejects.toMatchObject({ kind: "auth" });
    } finally {
      if (prev !== undefined) process.env.OPENROUTER_API_KEY = prev;
    }
  });
});
