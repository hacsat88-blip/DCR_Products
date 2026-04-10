import type { NavigatorRetryState } from "@/types/navigator";

export interface RetryCooldownView {
  active: boolean;
  retryLabel: string;
}

function parseRetryAtMs(value: string | null | undefined): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(trimmed)) {
    return null;
  }

  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRetryAfterSeconds(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

export function getRetryCooldownState(
  retryState: NavigatorRetryState | null,
  nowMs: number,
): RetryCooldownView {
  const retryAtMs = parseRetryAtMs(retryState?.retryAt);
  const retryAfterSeconds = parseRetryAfterSeconds(retryState?.retryAfterSeconds);
  const retryLabel = retryAfterSeconds !== null
    ? `約${Math.max(1, Math.ceil(retryAfterSeconds / 60))}分後に再試行`
    : "少し時間をおいて再試行";

  const active =
    retryState?.reason === "rate_limit" &&
    retryAtMs !== null &&
    retryAtMs > nowMs;

  return {
    active,
    retryLabel,
  };
}
