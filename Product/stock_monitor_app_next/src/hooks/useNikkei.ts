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

export function useNikkei(lastUpdatedAt: string | null, range?: string): NikkeiState {
  const [nikkei, setNikkei] = useState<NikkeiState>(INITIAL);

  useEffect(() => {
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
          asOf?: string | null;
          history?: { date: string; close: number }[];
        };
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
            typeof payload.asOf === "string" && payload.asOf.trim()
              ? `実測終値 (${payload.asOf.slice(0, 10)})`
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
  }, [lastUpdatedAt, range]);

  return nikkei;
}
