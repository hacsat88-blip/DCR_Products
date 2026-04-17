"use client";

import type { VIXAlert } from "@/types/navigator";

interface VIXAlertBannerProps {
  alert: VIXAlert;
}

export function VIXAlertBanner({ alert }: VIXAlertBannerProps): JSX.Element | null {
  if (!alert.isAbnormal) return null;

  return (
    <div className="animate-fade-in border border-danger/50 bg-danger/10 p-3">
      <div className="flex items-center gap-3">
        <span className="text-2xl animate-pulse">⚠️</span>
        <div className="flex-1">
          <p className="font-mono tabular-nums text-sm font-bold text-danger">
            VIX異常検知: {alert.level != null ? alert.level.toFixed(1) : "N/A"}
          </p>
          {alert.reason && (
            <p className="mt-0.5 font-mono tabular-nums text-[10px] text-danger/80">
              {alert.reason}
            </p>
          )}
          {alert.recommendation && (
            <p className="mt-1 font-mono tabular-nums text-[10px] text-text-secondary">
              推奨: {alert.recommendation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
