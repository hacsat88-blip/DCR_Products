"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface QuickPromptsProps {
  onPick: (prompt: QuickPromptDefinition) => void;
  disabled?: boolean;
  className?: string;
  portfolioAware?: boolean;
}

export interface QuickPromptDefinition {
  label: string;
  query: string;
  requiresPortfolio?: boolean;
}

export const PROMPTS: QuickPromptDefinition[] = [
  { label: "今日の押し目", query: "今日の押し目候補を教えて" },
  { label: "日経の地合い", query: "日経平均の地合いはどう？" },
  { label: "半導体セクター", query: "半導体セクターの動向を整理して" },
  { label: "為替動向", query: "ドル円の現状と注意点は？" },
  {
    label: "ポートフォリオ評価",
    query: "現在の自分のポートフォリオの評価ポイントを挙げて",
    requiresPortfolio: true,
  },
  { label: "高配当注目", query: "国内高配当で注目しておくべき銘柄群は？" },
];

export function QuickPrompts({
  onPick,
  disabled,
  className,
  portfolioAware = false,
}: QuickPromptsProps) {
  const prompts = React.useMemo(
    () =>
      PROMPTS.map((prompt) =>
        prompt.requiresPortfolio && portfolioAware
          ? { ...prompt, label: "ポートフォリオ評価（保有反映）" }
          : prompt,
      ),
    [portfolioAware],
  );

  return (
    <div
      className={cn("flex flex-wrap gap-2", className)}
      role="group"
      aria-label="クイックプロンプト"
    >
      {prompts.map((p) => (
        <button
          key={p.label}
          type="button"
          onClick={() => onPick(p)}
          disabled={disabled}
          title={p.requiresPortfolio ? "保有銘柄を参照して評価します" : undefined}
          className={cn(
            "rounded-full border border-accent/50 bg-accent/10 px-3 py-1 text-xs text-accent transition-shadow",
            "hover:shadow-[0_0_12px_rgba(184,107,255,0.5)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          #{p.label}
          {p.requiresPortfolio && (
            <span className="ml-1 rounded-full border border-neon/40 px-1 text-[10px] text-neon">
              PF
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export default QuickPrompts;
