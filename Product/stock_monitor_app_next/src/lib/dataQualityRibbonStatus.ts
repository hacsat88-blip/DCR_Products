import { DataMode } from "@/services/providers/types";

import { TokyoMarketSession } from "./tradingHours";

export type SessionStateLabel = "取引中" | "時間外";
export type UpdateStateLabel = "リアルタイム相当" | "遅延" | "終値ベース" | "モック";

interface ResolveUpdateStateInput {
  dataMode: DataMode;
  lastUpdatedAt: string | null;
  session: TokyoMarketSession;
  now?: Date;
}

const REALTIME_EQUIVALENT_MAX_AGE_MINUTES = 10;

function parseTimestamp(value: string | null): number | null {
  if (!value || !value.trim()) {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function isTradingSession(session: TokyoMarketSession): boolean {
  return session === "morning" || session === "afternoon";
}

export function resolveSessionStateLabel(session: TokyoMarketSession): SessionStateLabel {
  return isTradingSession(session) ? "取引中" : "時間外";
}

export function resolveUpdateStateLabel({
  dataMode,
  lastUpdatedAt,
  session,
  now = new Date(),
}: ResolveUpdateStateInput): UpdateStateLabel {
  if (dataMode === "mock") {
    return "モック";
  }

  if (!isTradingSession(session)) {
    return "終値ベース";
  }

  if (dataMode === "fallback") {
    return "遅延";
  }

  const updatedAt = parseTimestamp(lastUpdatedAt);
  if (updatedAt === null) {
    return "遅延";
  }

  const ageMinutes = Math.max(0, (now.getTime() - updatedAt) / (60 * 1000));
  return ageMinutes <= REALTIME_EQUIVALENT_MAX_AGE_MINUTES ? "リアルタイム相当" : "遅延";
}

