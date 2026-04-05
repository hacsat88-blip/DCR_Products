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
        className="group relative overflow-hidden rounded-none border border-mint/40 bg-canvas px-6 py-3 font-orb text-sm uppercase tracking-widest text-mint transition-all hover:border-mint hover:shadow-[0_0_20px_rgba(0,255,65,0.2)] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span className="relative z-10">
          {status === "running" ? "EXECUTING..." : "▸ AI NAVIGATOR"}
        </span>
        {/* Sweep animation on hover */}
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-mint/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
      </button>

      {/* Last execution timestamp */}
      {executedAt && (
        <span className="font-mono-tech text-[10px] text-text-muted">
          Last run: {formatExecutedAt(executedAt)}
        </span>
      )}
    </div>
  );
}
