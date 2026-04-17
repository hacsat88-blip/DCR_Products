"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";

export interface AiExplainParams {
  label: string;
  value?: string | number;
  context?: string;
  symbol?: string;
}

interface AiExplainContextValue {
  explain: (params: AiExplainParams) => Promise<void>;
}

const AiExplainContext = createContext<AiExplainContextValue | null>(null);

export function useAiExplain(): AiExplainContextValue {
  const ctx = useContext(AiExplainContext);
  if (!ctx) {
    throw new Error("useAiExplain must be used within <AiExplainProvider>");
  }
  return ctx;
}

interface DrawerState {
  open: boolean;
  loading: boolean;
  error?: string;
  explanation?: string;
  params?: AiExplainParams;
}

export function AiExplainProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [state, setState] = useState<DrawerState>({
    open: false,
    loading: false,
  });

  const close = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  const explain = useCallback(async (params: AiExplainParams) => {
    setState({ open: true, loading: true, params });
    try {
      const res = await fetch("/api/quick/inline-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        const msg = body?.error ?? `HTTP ${res.status}`;
        setState({ open: true, loading: false, error: msg, params });
        return;
      }
      const data = (await res.json()) as { explanation?: string };
      setState({
        open: true,
        loading: false,
        explanation: data.explanation ?? "",
        params,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      setState({ open: true, loading: false, error: msg, params });
    }
  }, []);

  useEffect(() => {
    if (!state.open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.open, close]);

  return (
    <AiExplainContext.Provider value={{ explain }}>
      {children}
      <AnimatePresence>
        {state.open ? (
          <motion.div
            role="dialog"
            aria-modal={true}
            aria-label="AI 解説"
            data-testid="ai-explain-drawer"
            className="inp-glass fixed inset-y-0 right-0 z-50 flex w-[min(420px,90vw)] flex-col p-4"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <h2
                className="text-sm font-semibold"
                style={{ color: "var(--inp-text-primary, #E6EDF7)" }}
              >
                {state.params?.label ?? "AI 解説"}
              </h2>
              <button
                type="button"
                aria-label="閉じる"
                onClick={close}
                className="rounded px-2 py-1 text-xs"
                style={{
                  color: "var(--inp-text-secondary, #9AA9BF)",
                  border: "1px solid var(--inp-border, #263042)",
                }}
              >
                ✕
              </button>
            </div>
            {state.params?.symbol ? (
              <div
                className="mt-1 text-xs"
                style={{ color: "var(--inp-text-secondary, #9AA9BF)" }}
              >
                {state.params.symbol}
              </div>
            ) : null}
            <div
              className="mt-3 whitespace-pre-wrap text-sm leading-relaxed"
              style={{ color: "var(--inp-text-primary, #E6EDF7)" }}
            >
              {state.loading ? (
                <div
                  role="status"
                  aria-live="polite"
                  data-testid="ai-explain-loading"
                >
                  読み込み中…
                </div>
              ) : null}
              {state.error ? (
                <div
                  role="alert"
                  data-testid="ai-explain-error"
                  style={{ color: "var(--inp-negative, #F97066)" }}
                >
                  エラー: {state.error}
                </div>
              ) : null}
              {!state.loading && !state.error && state.explanation ? (
                <div data-testid="ai-explain-body">{state.explanation}</div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AiExplainContext.Provider>
  );
}
