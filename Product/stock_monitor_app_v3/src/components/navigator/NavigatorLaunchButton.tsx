"use client";

import { useNavigatorStore } from "@/store/useNavigatorStore";

// ── Date formatter ──────────────────────────────

function formatExecutedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ja-JP", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

// ══════════════════════════════════════════════════
// NavigatorLaunchButton
// ══════════════════════════════════════════════════

export function NavigatorLaunchButton(): JSX.Element {
  const { openModal, status, executedAt } = useNavigatorStore();

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={openModal}
        disabled={status === "running"}
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {status === "running" ? "Executing..." : "AI Navigator"}
      </button>

      {/* Last execution timestamp */}
      {executedAt && (
        <span className="font-mono tabular-nums text-[10px] text-text-muted">
          Last run: {formatExecutedAt(executedAt)}
        </span>
      )}
    </div>
  );
}
