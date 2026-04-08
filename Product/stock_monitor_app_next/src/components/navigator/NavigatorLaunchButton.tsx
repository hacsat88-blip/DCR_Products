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
  const { openModal, status, executedAt, logHistory } = useNavigatorStore();
  const hasPreviousRun =
    Boolean(executedAt) || logHistory.length > 0 || status === "done" || status === "error";
  const runLabel = executedAt ? formatExecutedAt(executedAt) : "--";

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={openModal}
        disabled={status === "running"}
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {status === "running" ? "Executing..." : hasPreviousRun ? "AI Navigator (Re-run)" : "AI Navigator"}
      </button>

      {/* Last execution timestamp */}
      {hasPreviousRun && (
        <span className="font-mono tabular-nums text-[10px] text-text-muted">
          Last run: {runLabel} {`// logs:${logHistory.length}`}
        </span>
      )}
    </div>
  );
}
