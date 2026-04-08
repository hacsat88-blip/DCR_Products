"use client";

import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";

import { useNavigatorStore } from "@/store/useNavigatorStore";
import type { NavigatorStageLogEntry, PipelineStatus } from "@/types/navigator";

function statusLabel(status: PipelineStatus): string {
  switch (status) {
    case "running":
      return "RUNNING";
    case "done":
      return "DONE";
    case "error":
      return "ERROR";
    default:
      return "IDLE";
  }
}

function compactRunId(runId: string): string {
  const parts = runId.split("-");
  return (parts[parts.length - 1] ?? runId).toUpperCase();
}

export function NavigatorLiveTerminal(): JSX.Element {
  const {
    status,
    progress,
    currentStep,
    currentRunId,
    steps,
    logText,
    logStep,
    logHistory,
    bridgeMessage,
    intervention,
    updateInterventionInput,
    requestInterventionAdvance,
  } = useNavigatorStore();
  const [typedText, setTypedText] = useState("");

  useEffect(() => {
    if (!logText) {
      setTypedText("");
      return;
    }

    let pointer = 0;
    setTypedText("");
    const timer = window.setInterval(() => {
      pointer = Math.min(pointer + 2, logText.length);
      setTypedText(logText.slice(0, pointer));
      if (pointer >= logText.length) {
        window.clearInterval(timer);
      }
    }, 14);

    return () => window.clearInterval(timer);
  }, [logText]);

  const activeStep = logStep ?? currentStep;
  const activeStepLabel = useMemo(
    () => steps.find((step) => step.step === activeStep)?.label ?? `STATE ${activeStep + 1}`,
    [activeStep, steps],
  );
  const runCount = useMemo(() => new Set(logHistory.map((entry) => entry.runId)).size, [logHistory]);
  const historyRows = useMemo(() => {
    const reversed = [...logHistory].reverse();
    let previousRunId: string | null = null;
    return reversed.map((entry) => {
      const showRunHeader = entry.runId !== previousRunId;
      previousRunId = entry.runId;
      return { entry, showRunHeader };
    });
  }, [logHistory]);

  const currentViewText =
    typedText ||
    (status === "running"
      ? "stream waiting for next chunk..."
      : logHistory.length > 0
        ? "rerun-ready // stage history retained"
        : "No live stream yet.");

  return (
    <aside className="h-fit rounded-xl border border-primary/20 bg-[#10151f] shadow-card lg:sticky lg:top-20">
      <div className="flex items-center justify-between border-b border-primary/15 px-4 py-2.5">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-400/90" />
        </div>
        <p className="font-mono tabular-nums text-[11px] uppercase tracking-widest text-text-muted">
          navigator terminal
        </p>
        <span
          className={clsx(
            "rounded border px-1.5 py-0.5 font-mono tabular-nums text-[10px] tracking-wider",
            status === "running" && "border-primary/40 bg-primary/15 text-primary",
            status === "done" && "border-positive/40 bg-positive/15 text-positive",
            status === "error" && "border-danger/40 bg-danger/15 text-danger",
            status === "idle" && "border-text-muted/30 bg-text-muted/10 text-text-muted",
          )}
        >
          {statusLabel(status)}
        </span>
      </div>

      <div className="space-y-3 p-3">
        <div className="rounded-lg border border-primary/15 bg-black/35 p-3">
          <div className="mb-2 flex items-center justify-between font-mono tabular-nums text-[10px] uppercase tracking-wider text-text-muted">
            <span>{activeStepLabel}</span>
            <span>{`live stream ${Math.round(progress)}%`}</span>
          </div>
          <p className="mb-2 font-mono tabular-nums text-[10px] uppercase tracking-wide text-text-muted">
            {status === "running" && currentRunId
              ? `run ${compactRunId(currentRunId)}`
              : `history runs ${runCount}`}
          </p>
          <pre className="min-h-[170px] whitespace-pre-wrap break-words font-mono tabular-nums text-[11px] leading-relaxed text-primary/90">
            {currentViewText}
            {status === "running" && (
              <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-primary/90 align-middle" />
            )}
          </pre>
          {bridgeMessage && (
            <p className="mt-2 border-t border-primary/15 pt-2 font-mono tabular-nums text-[10px] uppercase tracking-wider text-primary/70">
              bridge ready for next stage
            </p>
          )}
        </div>

        {intervention && (
          <div className="space-y-2 rounded-lg border border-primary/20 bg-canvas p-3">
            <div className="flex items-center justify-between font-mono tabular-nums text-[10px] uppercase tracking-wide text-text-muted">
              <span>{`Intervention S${intervention.completedStep + 1}→S${intervention.nextStep + 1}`}</span>
              <span>
                {intervention.input.trim()
                  ? "auto-advance paused"
                  : `auto-advance ${intervention.remainingSeconds}s`}
              </span>
            </div>
            <textarea
              value={intervention.input}
              onChange={(event) => updateInterventionInput(event.target.value)}
              placeholder="Add optional bridge note before next stage..."
              className="min-h-[70px] w-full resize-y rounded border border-primary/20 bg-[#0d1420] px-2 py-1.5 font-mono tabular-nums text-[11px] text-text-primary outline-none transition-colors focus:border-primary/50"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={requestInterventionAdvance}
                className="rounded border border-primary/40 bg-primary/10 px-2 py-1 font-mono tabular-nums text-[10px] uppercase tracking-wider text-primary transition-colors hover:bg-primary/20"
              >
                advance now
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-mono tabular-nums text-[10px] uppercase tracking-widest text-text-muted">
              stage history
            </h4>
            <span className="font-mono tabular-nums text-[10px] uppercase tracking-wide text-text-muted">
              {`${logHistory.length} logs / ${runCount} runs`}
            </span>
          </div>
          {logHistory.length === 0 ? (
            <p className="rounded-md border border-primary/10 bg-canvas px-3 py-2 font-mono tabular-nums text-[10px] text-text-muted">
              completed logs will appear here after each stage.
            </p>
          ) : (
            <div className="space-y-2">
              {historyRows.map(({ entry, showRunHeader }) => (
                <div key={entry.id} className="space-y-1">
                  {showRunHeader && (
                    <div className="rounded-md border border-primary/20 bg-primary/5 px-2 py-1 font-mono tabular-nums text-[10px] uppercase tracking-wide text-primary/80">
                      {`run ${compactRunId(entry.runId)} // ${new Date(entry.completedAt).toLocaleString("ja-JP")}`}
                    </div>
                  )}
                  <CompletedStageAccordion entry={entry} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function CompletedStageAccordion({ entry }: { entry: NavigatorStageLogEntry }): JSX.Element {
  return (
    <details className="rounded-md border border-primary/20 bg-canvas px-3 py-2">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-mono tabular-nums text-[10px]">
        <span className="text-primary/90">
          {`S${entry.step + 1} | ${entry.label}`}
        </span>
        <span className="text-text-muted">
          {new Date(entry.completedAt).toLocaleTimeString("ja-JP", { hour12: false })}
        </span>
      </summary>
      <pre className="mt-2 whitespace-pre-wrap break-words border-t border-primary/10 pt-2 font-mono tabular-nums text-[10px] leading-relaxed text-text-secondary">
        {entry.text}
      </pre>
    </details>
  );
}
