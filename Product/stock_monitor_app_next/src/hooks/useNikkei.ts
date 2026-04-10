"use client";

import { useEffect, useState } from "react";

export interface NikkeiState {
  latestClose: number | null;
  diff: number | null;
  diffPercent: number | null;
  sourceLabel: string | null;
  history: { date: string; close: number }[];
}

const INITIAL: NikkeiState = {
  latestClose: null,
  diff: null,
  diffPercent: null,
  sourceLabel: null,
  history: []
};

export interface UseNikkeiOptions {
  enabled?: boolean;
}

export function useNikkei(lastUpdatedAt: string | null, range?: string, options: UseNikkeiOptions = {}): NikkeiState {
  const { enabled = true } = options;
  const [nikkei, setNikkei] = useState<NikkeiState>(INITIAL);

  useEffect(() => {
    if (!enabled) {
      setNikkei(INITIAL);
      return;
    }

    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const response = await fetch(
          `/api/market-index?index=nikkei&range=${range || "5d"}`,
          { cache: "no-store" }
        );
        if (!response.ok) return;
        const payload = (await response.json()) as {
          latestClose?: number | null;
          diff?: number | null;
          diffPercent?: number | null;
          source?: string | null;
          sourceLabel?: string | null;
          asOf?: string | null;
          sourceTimestamp?: string | null;
          history?: { date: string; close: number }[];
        };
        const sourceTimestamp =
          typeof payload.sourceTimestamp === "string" && payload.sourceTimestamp.trim()
            ? payload.sourceTimestamp
            : typeof payload.asOf === "string" && payload.asOf.trim()
              ? payload.asOf
              : null;
        if (cancelled) return;
        setNikkei({
          latestClose:
            typeof payload.latestClose === "number" && Number.isFinite(payload.latestClose)
              ? payload.latestClose
              : null,
          diff: typeof payload.diff === "number" && Number.isFinite(payload.diff) ? payload.diff : null,
          diffPercent:
            typeof payload.diffPercent === "number" && Number.isFinite(payload.diffPercent)
              ? payload.diffPercent
              : null,
          sourceLabel:
            sourceTimestamp
              ? `実測終値 (${sourceTimestamp.slice(0, 10)})`
              : typeof payload.source === "string" && payload.source.trim()
                ? payload.source
                : null,
          history: Array.isArray(payload.history) ? payload.history : []
        });
      } catch {
        if (!cancelled) {
          setNikkei({ latestClose: null, diff: null, diffPercent: null, sourceLabel: "取得失敗", history: [] });
        }
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [enabled, lastUpdatedAt, range]);

  return nikkei;
}
