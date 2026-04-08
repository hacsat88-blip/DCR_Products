import type { DebatePriority, DebateSignal, DebateVerdict } from "@/types/navigator";

const PRIORITY_BASE: Record<DebatePriority, number> = {
  高: 76,
  中: 60,
  低: 44,
};

const SIGNAL_BIAS: Record<DebateSignal, number> = {
  go: 14,
  watch: 0,
  out: -12,
};

const SIGNAL_STRENGTH: Record<DebateSignal, number> = {
  go: 88,
  watch: 56,
  out: 24,
};

export interface ConfidenceTone {
  barClass: string;
  textClass: string;
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getConfidenceTone(confidence: number): ConfidenceTone {
  if (confidence > 80) {
    return { barClass: "bg-positive", textClass: "text-positive" };
  }
  if (confidence > 60) {
    return { barClass: "bg-secondary", textClass: "text-secondary" };
  }
  if (confidence > 40) {
    return { barClass: "bg-amber", textClass: "text-amber" };
  }
  return { barClass: "bg-danger", textClass: "text-danger" };
}

export function recommendationStrength(signal: DebateSignal): number {
  return SIGNAL_STRENGTH[signal];
}

export function resolveDebateConfidence(
  verdict: Pick<DebateVerdict, "signal" | "priority" | "confidence">,
): number {
  if (typeof verdict.confidence === "number" && Number.isFinite(verdict.confidence)) {
    return clampPercent(verdict.confidence);
  }

  return clampPercent(PRIORITY_BASE[verdict.priority] + SIGNAL_BIAS[verdict.signal]);
}

