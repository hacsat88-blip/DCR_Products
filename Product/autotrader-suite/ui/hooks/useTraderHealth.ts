import { useEffect, useState } from "react";

import { HEALTH_POLL_MS } from "@/lib/constants";
import type {
  RawTraderHealthPayload,
  TraderHealthSnapshot,
  TraderHealthViewModel
} from "@/types/trader";

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isRawTraderHealthPayload(value: unknown): value is RawTraderHealthPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<RawTraderHealthPayload>;

  return (
    (candidate.status === "healthy" || candidate.status === "degraded") &&
    (candidate.mode === "paper" || candidate.mode === "live") &&
    (candidate.order_mode === "stub_only" || candidate.order_mode === "broker_auto") &&
    (candidate.live_armed === undefined || typeof candidate.live_armed === "boolean") &&
    isString(candidate.server_time) &&
    (candidate.last_price_tick_at === null || isString(candidate.last_price_tick_at)) &&
    (candidate.last_price_code === null || isString(candidate.last_price_code)) &&
    (candidate.ai_status === "ready" || candidate.ai_status === "degraded") &&
    (candidate.reference_status === "ready" || candidate.reference_status === "degraded") &&
    (candidate.last_warning === null || isString(candidate.last_warning))
  );
}

function toHealthSnapshot(raw: RawTraderHealthPayload): TraderHealthSnapshot {
  return {
    status: raw.status,
    mode: raw.mode,
    orderMode: raw.order_mode,
    liveArmed: raw.live_armed ?? false,
    serverTime: raw.server_time,
    lastPriceTickAt: raw.last_price_tick_at,
    lastPriceCode: raw.last_price_code,
    aiStatus: raw.ai_status,
    referenceStatus: raw.reference_status,
    lastWarning: raw.last_warning
  };
}

function createInitialHealthState(): TraderHealthViewModel {
  return {
    fetchState: "loading",
    snapshot: null
  };
}

export function useTraderHealth(): TraderHealthViewModel {
  const [state, setState] = useState<TraderHealthViewModel>(() => createInitialHealthState());

  useEffect(() => {
    let disposed = false;

    const load = async (): Promise<void> => {
      try {
        const response = await fetch("/api/health", {
          method: "GET",
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error(`health fetch failed: ${response.status}`);
        }

        const payload: unknown = await response.json();
        if (!isRawTraderHealthPayload(payload)) {
          throw new Error("invalid health payload");
        }

        if (disposed) {
          return;
        }

        setState({
          fetchState: "ready",
          snapshot: toHealthSnapshot(payload)
        });
      } catch {
        if (disposed) {
          return;
        }

        setState((current) => ({
          ...current,
          fetchState: "unreachable"
        }));
      }
    };

    void load();
    const intervalId = setInterval(() => {
      void load();
    }, HEALTH_POLL_MS);

    return () => {
      disposed = true;
      clearInterval(intervalId);
    };
  }, []);

  return state;
}