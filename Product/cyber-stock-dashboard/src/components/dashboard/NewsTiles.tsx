"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { NeonBadge, NeonCard } from "@/components/ui";

interface NewsItem {
  id: string;
  title: string;
  url: string;
  source?: string;
  publishedAt: string;
  summary?: string;
  sentimentLabel?: "positive" | "neutral" | "negative";
}

interface NewsResponse {
  items: NewsItem[];
  warning?: string;
}

async function fetchNews(): Promise<NewsResponse> {
  const res = await fetch("/api/news?limit=12", { cache: "no-store" });
  if (!res.ok) {
    const fallback = `news ${res.status}`;
    let detail: string | undefined;
    try {
      const body = (await res.json()) as { detail?: string; error?: string };
      detail = body.detail ?? body.error;
    } catch {
      // ignore json parse errors
    }
    throw new Error(detail ?? fallback);
  }
  return res.json();
}

function sentimentSignal(s?: NewsItem["sentimentLabel"]) {
  if (s === "positive") return "go" as const;
  if (s === "negative") return "stop" as const;
  return "fix" as const;
}

export function NewsTiles() {
  const q = useQuery({
    queryKey: ["dashboard-news"],
    queryFn: fetchNews,
    staleTime: 5 * 60 * 1000,
  });

  const items = q.data?.items ?? [];
  const warning = q.data?.warning;
  const errorDetail = q.error instanceof Error ? q.error.message : undefined;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="heading-en text-sm text-text/70">NEWS FEED</h2>
      {q.isLoading && items.length === 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <NeonCard key={i} className="h-32 animate-pulse" />
          ))}
        </div>
      )}
      {q.isError && (
        <NeonCard glow="alert" className="text-xs text-alert">
          ニュース取得に失敗しました
          {errorDetail && (
            <p className="mt-1 text-[10px] text-text/60">{errorDetail}</p>
          )}
        </NeonCard>
      )}
      {warning && (
        <NeonCard glow="subtle" className="text-[11px] text-amber-300/80">
          {warning}
        </NeonCard>
      )}
      {items.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((n) => (
            <li key={n.id}>
              <a
                href={n.url}
                target="_blank"
                rel="noreferrer noopener"
                className="block focus-visible:outline-none"
              >
                <NeonCard className="flex h-full flex-col gap-2 p-4 transition-transform hover:-translate-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="heading-en text-[10px] text-text/50">
                      {n.source ?? "news"}
                    </span>
                    <NeonBadge signal={sentimentSignal(n.sentimentLabel)} />
                  </div>
                  <h3 className="line-clamp-2 text-sm font-semibold text-neon">
                    {n.title}
                  </h3>
                  {n.summary && (
                    <p className="line-clamp-3 text-[11px] leading-relaxed text-text/70">
                      {n.summary}
                    </p>
                  )}
                  <span className="mt-auto text-[10px] text-text/40">
                    {new Date(n.publishedAt).toLocaleString("ja-JP")}
                  </span>
                </NeonCard>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
