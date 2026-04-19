"use client";

import * as React from "react";
import { NeonButton } from "@/components/ui/NeonButton";
import { NeonCard } from "@/components/ui/NeonCard";
import { cn } from "@/lib/cn";
import { buildPortfolioChatContext } from "@/lib/portfolioChatContext";
import { QuickPrompts } from "./QuickPrompts";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatPanelProps {
  context?: {
    tickers?: string[];
    sector?: string;
    market?: string;
    portfolioSummary?: string;
  };
  initialMessages?: ChatMessage[];
  className?: string;
  title?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  showQuickPrompts?: boolean;
  enablePortfolioContext?: boolean;
  showWebSearchToggle?: boolean;
}

interface SSEChunk {
  delta?: string;
  warning?: string;
  done?: boolean;
  error?: string;
  message?: string;
  fallback?: boolean;
}

interface PortfolioContextRow {
  code: string;
  marketValueJpy: number;
  costJpy: number;
  pnlJpy: number;
  weightPercent: number;
  currentPrice: number | null;
}

interface PortfolioApiResponse {
  data?: PortfolioContextRow[];
}

function parseSSELines(buffer: string): { events: SSEChunk[]; rest: string } {
  const events: SSEChunk[] = [];
  let rest = buffer;
  for (;;) {
    const idx = rest.indexOf("\n\n");
    if (idx < 0) break;
    const block = rest.slice(0, idx);
    rest = rest.slice(idx + 2);
    for (const line of block.split("\n")) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice(5).trim();
      if (payload === "[DONE]") {
        events.push({ done: true });
        continue;
      }
      try {
        events.push(JSON.parse(payload) as SSEChunk);
      } catch {
        // ignore malformed
      }
    }
  }
  return { events, rest };
}

export function ChatPanel({
  context,
  initialMessages = [],
  className,
  title = "AI チャット",
  collapsible = false,
  defaultCollapsed = false,
  showQuickPrompts = true,
  enablePortfolioContext = false,
  showWebSearchToggle = false,
}: ChatPanelProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [pending, setPending] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
  const [portfolioState, setPortfolioState] = React.useState<
    "available" | "empty" | "unavailable" | null
  >(context?.portfolioSummary ? "available" : null);
  const [portfolioSummary, setPortfolioSummary] = React.useState<string | undefined>(
    context?.portfolioSummary,
  );
  const [portfolioTickers, setPortfolioTickers] = React.useState<string[] | undefined>(
    context?.tickers,
  );
  const [webSearchEnabled, setWebSearchEnabled] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const pendingRef = React.useRef("");

  React.useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, pending]);

  const loadPortfolioContext = React.useCallback(async () => {
    try {
      const res = await fetch("/api/portfolio", { cache: "no-store" });
      if (!res.ok) throw new Error(`portfolio ${res.status}`);
      const json = (await res.json()) as PortfolioApiResponse;
      const rows = Array.isArray(json.data) ? json.data : [];
      return {
        portfolioSummary: buildPortfolioChatContext(rows),
        portfolioTickers:
          rows.length > 0 ? rows.map((row) => row.code) : context?.tickers,
        portfolioState: (rows.length > 0 ? "available" : "empty") as
          | "available"
          | "empty",
      };
    } catch {
      return {
        portfolioSummary: undefined,
        portfolioTickers: context?.tickers,
        portfolioState: "unavailable" as const,
      };
    }
  }, [context]);

  React.useEffect(() => {
    if (!enablePortfolioContext) return;

    let active = true;
    async function hydratePortfolioContext() {
      const next = await loadPortfolioContext();
      if (!active) return;
      setPortfolioSummary(next.portfolioSummary);
      setPortfolioTickers(next.portfolioTickers);
      setPortfolioState(next.portfolioState);
    }

    void hydratePortfolioContext();
    return () => {
      active = false;
    };
  }, [enablePortfolioContext, loadPortfolioContext]);

  const send = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;
      setError(null);
      const next: ChatMessage[] = [
        ...messages,
        { role: "user", content: trimmed },
      ];
      setMessages(next);
      setInput("");
      setPending("");
      pendingRef.current = "";
      setStreaming(true);

      const ac = new AbortController();
      abortRef.current = ac;

      try {
        let resolvedSummary = portfolioSummary;
        let resolvedTickers = portfolioTickers ?? context?.tickers;
        if (enablePortfolioContext && portfolioState == null) {
          const nextPortfolio = await loadPortfolioContext();
          resolvedSummary = nextPortfolio.portfolioSummary;
          resolvedTickers = nextPortfolio.portfolioTickers;
          setPortfolioSummary(nextPortfolio.portfolioSummary);
          setPortfolioTickers(nextPortfolio.portfolioTickers);
          setPortfolioState(nextPortfolio.portfolioState);
        }
        const requestContext =
          enablePortfolioContext && resolvedSummary
            ? {
                ...context,
                tickers: resolvedTickers,
                portfolioSummary: resolvedSummary,
              }
            : context;
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: next,
            context: requestContext,
            stream: true,
            webSearch: webSearchEnabled,
          }),
          signal: ac.signal,
        });

        if (!res.ok) {
          let body: unknown = null;
          try {
            body = await res.json();
          } catch {
            // noop
          }
          const msg =
            (body as { message?: string; error?: string } | null)?.message ??
            (body as { error?: string } | null)?.error ??
            `HTTP ${res.status}`;
          throw new Error(msg);
        }

        const ctype = res.headers.get("content-type") ?? "";
        if (!res.body || !ctype.includes("text/event-stream")) {
          const data = (await res.json()) as { content?: string };
          const full = data.content ?? "";
          setMessages((m) => [...m, { role: "assistant", content: full }]);
          setPending("");
          pendingRef.current = "";
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let acc = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const { events, rest } = parseSSELines(buffer);
          buffer = rest;
          for (const ev of events) {
            if (ev.error) throw new Error(ev.message ?? ev.error);
            if (ev.delta) {
              acc += ev.delta;
              pendingRef.current = acc;
              setPending(acc);
            }
          }
        }
        if (acc.length > 0) {
          setMessages((m) => [...m, { role: "assistant", content: acc }]);
        }
        setPending("");
        pendingRef.current = "";
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") {
          if (pendingRef.current) {
            const partial = pendingRef.current;
            setMessages((m) => [
              ...m,
              { role: "assistant", content: partial + "\n（中断されました）" },
            ]);
          }
        } else {
          setError(err instanceof Error ? err.message : String(err));
        }
        setPending("");
        pendingRef.current = "";
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [
      messages,
      streaming,
      context,
      enablePortfolioContext,
      loadPortfolioContext,
      portfolioState,
      portfolioSummary,
      portfolioTickers,
      webSearchEnabled,
    ],
  );

  const cancel = React.useCallback(() => {
    abortRef.current?.abort();
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void send(input);
  }

  const portfolioHint =
    portfolioState === "available"
      ? "ポートフォリオ文脈を自動添付中"
      : portfolioState === "empty"
        ? "ポートフォリオ未登録のため一般情報として回答します"
        : portfolioState === "unavailable"
          ? "ポートフォリオ取得失敗のため一般情報として回答します"
          : null;

  return (
    <NeonCard glow="subtle" className={cn("flex flex-col gap-3", className)}>
      <header className="flex items-center justify-between">
        <h2 className="heading-en text-sm font-bold tracking-wider text-neon">
          💬 {title}
        </h2>
        {collapsible && (
          <NeonButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
          >
            {collapsed ? "開く" : "閉じる"}
          </NeonButton>
        )}
      </header>

      {portfolioHint && (
        <p className="text-[11px] text-text/60" role="status">
          {portfolioHint}
        </p>
      )}

      {!collapsed && (
        <>
          {showQuickPrompts && (
            <QuickPrompts
              onPick={(prompt) => void send(prompt.query)}
              disabled={streaming}
              portfolioAware={portfolioState === "available"}
            />
          )}

          {showWebSearchToggle && (
            <label className="flex items-center justify-between gap-3 rounded-lg border border-text/15 bg-bg/40 px-3 py-2 text-xs text-text/70">
              <span>
                最新情報モード（Web検索）
                <span className="ml-2 text-[10px] text-amber-200">
                  beta / 追加コストの可能性あり
                </span>
              </span>
              <input
                type="checkbox"
                role="checkbox"
                aria-label="Web検索"
                checked={webSearchEnabled}
                onChange={(e) => setWebSearchEnabled(e.target.checked)}
                disabled={streaming}
                className="h-4 w-4 accent-cyan-400"
              />
            </label>
          )}

          <div
            ref={listRef}
            className="max-h-80 min-h-32 overflow-y-auto rounded-xl border border-neon/20 bg-bg/40 p-3 font-mono text-sm leading-relaxed"
            aria-live="polite"
            aria-busy={streaming}
            data-testid="chat-list"
          >
            {messages.length === 0 && !pending && !streaming && (
              <p className="text-text/40">
                質問を入力するか、上のチップから選んでください。
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {messages.map((m, i) => (
                <li
                  key={i}
                  className={cn(
                    "flex",
                    m.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block max-w-[85%] whitespace-pre-wrap rounded-lg border px-3 py-2",
                      m.role === "user"
                        ? "border-neon/50 bg-neon/10 text-neon"
                        : "border-accent/40 bg-accent/10 text-text",
                    )}
                    data-role={m.role}
                  >
                    {m.content}
                  </span>
                </li>
              ))}
              {pending && (
                <li className="flex justify-start">
                  <span
                    className="inline-block max-w-[85%] whitespace-pre-wrap rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-text"
                    data-role="assistant-pending"
                  >
                    {pending}
                  </span>
                </li>
              )}
              {streaming && !pending && (
                <li className="flex justify-start">
                  <span
                    className="inline-flex animate-pulse items-center gap-1 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-accent"
                    data-testid="thinking"
                  >
                    考え中…
                  </span>
                </li>
              )}
            </ul>
          </div>

          {error && (
            <p className="text-xs text-alert" role="alert">
              {error}
            </p>
          )}

          <form onSubmit={onSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例: 半導体の押し目教えて"
              maxLength={2000}
              disabled={streaming}
              aria-label="質問入力"
              className="flex-1 rounded-lg border border-text/20 bg-bg/60 p-2 text-sm text-text placeholder:text-text/40 focus:border-neon/60 focus:outline-none"
            />
            {streaming ? (
              <NeonButton
                type="button"
                variant="danger"
                size="md"
                onClick={cancel}
              >
                キャンセル
              </NeonButton>
            ) : (
              <NeonButton
                type="submit"
                variant="primary"
                size="md"
                disabled={!input.trim()}
              >
                送信
              </NeonButton>
            )}
          </form>
          <p className="text-[10px] text-text/40">
            ※参考情報のみ。投資判断はご自身の責任で行ってください。
          </p>
        </>
      )}
    </NeonCard>
  );
}

export default ChatPanel;
