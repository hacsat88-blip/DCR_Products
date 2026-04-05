"use client";

import { useCallback, useEffect, useRef } from "react";
import clsx from "clsx";

import { useNavigatorStore } from "@/store/useNavigatorStore";
import type {
  MarketScope,
  RiskTolerance,
  InvestmentHorizon,
  PipelineStepState,
} from "@/types/navigator";

// ── Option descriptors ──────────────────────────

interface OptionItem<T extends string> {
  value: T;
  label: string;
  icon?: string;
}

const MARKET_OPTIONS: OptionItem<MarketScope>[] = [
  { value: "US", label: "US MARKET", icon: "🇺🇸" },
  { value: "JP", label: "JP MARKET", icon: "🇯🇵" },
  { value: "BOTH", label: "BOTH", icon: "🌐" },
];

const RISK_OPTIONS: OptionItem<RiskTolerance>[] = [
  { value: "low", label: "低 (元本重視)" },
  { value: "mid", label: "中 (バランス)" },
  { value: "high", label: "高 (成長重視)" },
];

const HORIZON_OPTIONS: OptionItem<InvestmentHorizon>[] = [
  { value: "short", label: "短期 (〜1年)" },
  { value: "mid", label: "中期 (1〜3年)" },
  { value: "long", label: "長期 (3年超)" },
];

// ── Execute button label helper ─────────────────

function executeLabel(market: MarketScope | undefined): string {
  switch (market) {
    case "US":
      return "EXECUTE: 🇺🇸 US MARKET";
    case "JP":
      return "EXECUTE: 🇯🇵 JP MARKET";
    case "BOTH":
      return "EXECUTE: 🌐 BOTH MARKETS";
    default:
      return "EXECUTE: SELECT MARKET ▸";
  }
}

// ── Step status prefix & styling ────────────────

function stepPrefix(status: PipelineStepState["status"]): string {
  switch (status) {
    case "done":
      return "✓";
    case "running":
      return "▸";
    case "error":
      return "✗";
    default:
      return "○";
  }
}

function stepStatusLabel(status: PipelineStepState["status"]): string {
  switch (status) {
    case "done":
      return "DONE";
    case "running":
      return "RUNNING...";
    case "error":
      return "ERROR";
    default:
      return "STANDBY";
  }
}

// ── Selector button (shared) ────────────────────

interface SelectorButtonProps<T extends string> {
  option: OptionItem<T>;
  selected: boolean;
  onSelect: (value: T) => void;
}

function SelectorButton<T extends string>({
  option,
  selected,
  onSelect,
}: SelectorButtonProps<T>): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onSelect(option.value)}
      role="radio"
      aria-checked={selected}
      aria-label={option.label}
      className={clsx(
        "rounded-none border px-4 py-2 font-mono-tech text-sm transition-all duration-200",
        selected
          ? "border-mint bg-mint/20 text-mint shadow-[0_0_12px_rgba(0,255,65,0.15)]"
          : "border-mint/20 text-text-secondary hover:border-mint/40 hover:text-mint/80",
      )}
    >
      {option.icon && <span className="mr-1.5">{option.icon}</span>}
      {option.label}
    </button>
  );
}

// ── Option group ────────────────────────────────

interface OptionGroupProps<T extends string> {
  label: string;
  options: OptionItem<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
}

function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: OptionGroupProps<T>): JSX.Element {
  return (
    <div className="space-y-2.5">
      <p className="font-orb text-xs uppercase tracking-widest text-mint/60">
        ▸ {label}
      </p>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <SelectorButton
            key={opt.value}
            option={opt}
            selected={value === opt.value}
            onSelect={onChange}
          />
        ))}
      </div>
    </div>
  );
}

// ── Pipeline step row ───────────────────────────

function StepRow({
  step,
  index,
}: {
  step: PipelineStepState;
  index: number;
}): JSX.Element {
  return (
    <div
      className={clsx(
        "flex items-center gap-3 font-mono-tech text-sm transition-all duration-300",
        // stagger entrance from left
        "animate-fade-in",
      )}
      style={{ animationDelay: `${index * 120}ms` }}
    >
      {/* prefix icon */}
      <span
        className={clsx(
          "w-4 text-center",
          step.status === "done" && "text-mint/70",
          step.status === "running" && "text-mint animate-pulse",
          step.status === "error" && "text-danger",
          step.status === "standby" && "text-text-muted",
        )}
      >
        {stepPrefix(step.status)}
      </span>

      {/* label */}
      <span
        className={clsx(
          "flex-1",
          step.status === "done" && "text-mint/70",
          step.status === "running" && "text-mint",
          step.status === "error" && "text-danger",
          step.status === "standby" && "text-text-muted/60",
        )}
      >
        {step.label}
      </span>

      {/* status tag */}
      <span
        className={clsx(
          "w-24 text-right text-xs uppercase tracking-wider",
          step.status === "done" && "text-mint/50",
          step.status === "running" && "text-mint animate-pulse-soft",
          step.status === "error" && "text-danger",
          step.status === "standby" && "text-text-muted/40",
        )}
      >
        {stepStatusLabel(step.status)}
      </span>
    </div>
  );
}

// ── Progress bar ────────────────────────────────

function ProgressBar({ value }: { value: number }): JSX.Element {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between font-mono-tech text-xs text-mint/60">
        <span>PROGRESS</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden border border-mint/20 bg-canvas">
        <div
          className="h-full bg-mint transition-all duration-500 ease-smooth shadow-[0_0_10px_rgba(0,255,65,0.4)]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

// ── Done overlay ────────────────────────────────

function DoneOverlay(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 animate-scale-in">
      <span className="text-4xl text-mint drop-shadow-[0_0_20px_rgba(0,255,65,0.5)]">
        ✓
      </span>
      <span className="font-orb text-lg uppercase tracking-widest text-mint">
        PIPELINE COMPLETE
      </span>
      <span className="font-mono-tech text-xs text-mint/50">
        Results ready — closing...
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════
// NavigatorSetupModal
// ══════════════════════════════════════════════════

export function NavigatorSetupModal(): JSX.Element | null {
  const {
    isModalOpen,
    settings,
    status,
    analysisMode,
    steps,
    progress,
    error,
    diagnosticMessage,
    closeModal,
    updateSettings,
    runPipeline,
  } = useNavigatorStore();

  const overlayRef = useRef<HTMLDivElement>(null);
  const isSetup = status === "idle" || status === "error";
  const isRunning = status === "running";
  const isDone = status === "done";
  const canClose = isSetup;
  const canExecute = Boolean(settings?.market);

  // ── Escape key handler ──────────────────────────

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && canClose) {
        closeModal();
      }
    },
    [canClose, closeModal],
  );

  useEffect(() => {
    if (!isModalOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    // Lock body scroll while modal is open
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isModalOpen, handleKeyDown]);

  // ── Click-outside handler ─────────────────────

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === overlayRef.current && canClose) {
        closeModal();
      }
    },
    [canClose, closeModal],
  );

  // ── Execute ───────────────────────────────────

  const handleExecute = useCallback(() => {
    if (!canExecute) return;
    void runPipeline();
  }, [canExecute, runPipeline]);

  // ── Don't render when closed ──────────────────

  if (!isModalOpen) return null;

  // ── Render ────────────────────────────────────

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label="Investment Navigator"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in"
    >
      {/* ── Modal panel ── */}
      <div
        className={clsx(
          "relative mx-4 w-full max-w-lg border border-mint/30 bg-canvas shadow-[0_0_40px_rgba(0,255,65,0.06)]",
          "animate-scale-in",
        )}
      >
        {/* ── Header bar ── */}
        <div className="flex items-center justify-between border-b border-mint/20 px-5 py-3">
          <h2 className="font-orb text-sm uppercase tracking-widest text-mint">
            {isRunning
              ? "EXECUTING PIPELINE..."
              : isDone
                ? "PIPELINE COMPLETE"
                : "INVESTMENT NAVIGATOR // AI PIPELINE"}
          </h2>
          {canClose && (
            <button
              type="button"
              onClick={closeModal}
              className="font-mono-tech text-sm text-mint/40 transition-colors hover:text-mint"
              aria-label="Close modal"
            >
              [X]
            </button>
          )}
        </div>

        {/* ── Content ── */}
        <div className="px-5 py-5">
          {/* Setup phase */}
          {isSetup && (
            <div className="space-y-6">
              {/* Market selector */}
              <OptionGroup
                label="主軸市場を選択"
                options={MARKET_OPTIONS}
                value={settings?.market}
                onChange={(v) => updateSettings({ market: v })}
              />

              {/* Risk tolerance */}
              <OptionGroup
                label="リスク許容度"
                options={RISK_OPTIONS}
                value={settings?.risk}
                onChange={(v) => updateSettings({ risk: v })}
              />

              {/* Investment horizon */}
              <OptionGroup
                label="投資期間"
                options={HORIZON_OPTIONS}
                value={settings?.horizon}
                onChange={(v) => updateSettings({ horizon: v })}
              />

              {/* Error display */}
              {error && (
                <div className="border border-danger/30 bg-danger/5 px-4 py-2">
                  <p className="font-mono-tech text-xs text-danger">
                    ✗ ERROR: {error}
                  </p>
                  {diagnosticMessage && (
                    <p className="mt-1 break-words font-mono-tech text-[10px] text-danger/80">
                      DETAIL: {diagnosticMessage}
                    </p>
                  )}
                </div>
              )}

              {analysisMode === "mock-fallback" && (
                <div className="border border-yellow-500/30 bg-yellow-500/10 px-4 py-2">
                  <p className="font-mono-tech text-xs text-yellow-300">
                    ⚠ SOURCE: MOCK FALLBACK (要再実行)
                  </p>
                </div>
              )}

              {/* Execute button */}
              <button
                type="button"
                onClick={handleExecute}
                disabled={!canExecute}
                className={clsx(
                  "w-full rounded-none border px-6 py-3 font-orb text-sm uppercase tracking-widest transition-all",
                  canExecute
                    ? "border-mint bg-mint/10 text-mint hover:bg-mint/20 hover:shadow-[0_0_20px_rgba(0,255,65,0.2)] animate-pborder"
                    : "border-mint/10 text-mint/30 opacity-30 cursor-not-allowed",
                )}
              >
                {executeLabel(settings?.market)}
              </button>
            </div>
          )}

          {/* Pipeline running phase */}
          {isRunning && (
            <div className="space-y-5" aria-live="polite" aria-atomic="true">
              <ProgressBar value={progress} />

              <div className="space-y-2.5 border-t border-mint/10 pt-4">
                {steps.map((step, i) => (
                  <StepRow key={step.step} step={step} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* Done phase (brief flash before auto-close) */}
          {isDone && <DoneOverlay />}
        </div>

        {/* ── Decorative scanline / CRT effect ── */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.08) 2px, rgba(0,255,65,0.08) 4px)",
          }}
        />
      </div>
    </div>
  );
}
