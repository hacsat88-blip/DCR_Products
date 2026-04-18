"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { NeonBadge } from "@/components/ui";
import { GlobalTabs } from "@/components/navigation/GlobalTabs";

interface SentimentResp {
  signal: "🟢" | "🟡" | "🔴";
  level: "normal" | "caution" | "storm";
  badge: "go" | "fix" | "stop";
  reasons: string[];
  recommendedAction: string;
  fallback?: boolean;
}

async function fetchSentiment(): Promise<SentimentResp> {
  const res = await fetch("/api/market/sentiment", { cache: "no-store" });
  if (!res.ok) throw new Error(`sentiment ${res.status}`);
  return res.json();
}

export function DashboardHeader() {
  const q = useQuery({
    queryKey: ["sentiment"],
    queryFn: fetchSentiment,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-text/10 pb-3">
      <h1 className="heading-en text-xl font-bold text-neon drop-shadow-[0_0_12px_rgba(0,225,255,0.8)] sm:text-2xl">
        ⚡ Cyber Stock Dashboard
      </h1>
      <GlobalTabs />
      <div
        className="flex items-center gap-2"
        title={q.data?.recommendedAction ?? "地合い判定中"}
      >
        <span className="heading-en text-[10px] text-text/50">SENTIMENT</span>
        {q.data ? (
          <NeonBadge
            signal={q.data.badge}
            label={q.data.level.toUpperCase()}
          />
        ) : (
          <NeonBadge signal="fix" label="…" />
        )}
      </div>
    </header>
  );
}
