"use client";

import React, { Suspense } from "react";

import { CollapseSimulatorPanel } from "@/components/dashboard/CollapseSimulatorPanel";
import { ContrarianPanel } from "@/components/dashboard/ContrarianPanel";
import { NavigatorLaunchButton, NavigatorResultsPanel } from "@/components/navigator";

import type { IsPanelInTab } from "./types";

const BacktestPanel = React.lazy(() =>
  import("@/components/dashboard/BacktestPanel").then((m) => ({ default: m.BacktestPanel }))
);
const ComparePanel = React.lazy(() =>
  import("@/components/dashboard/ComparePanel").then((m) => ({ default: m.ComparePanel }))
);
const TimelinePanel = React.lazy(() =>
  import("@/components/dashboard/TimelinePanel").then((m) => ({ default: m.TimelinePanel }))
);
const MorningCheckPanel = React.lazy(() =>
  import("@/components/dashboard/MorningCheckPanel").then((m) => ({ default: m.MorningCheckPanel }))
);
const SnapshotPanel = React.lazy(() =>
  import("@/components/dashboard/SnapshotPanel").then((m) => ({ default: m.SnapshotPanel }))
);
const DecisionReviewPanel = React.lazy(() =>
  import("@/components/dashboard/DecisionReviewPanel").then((m) => ({ default: m.DecisionReviewPanel }))
);

interface AnalysisTabSectionProps {
  isPanelInTab: IsPanelInTab;
  fallback: React.ReactNode;
  stocks: React.ComponentProps<typeof MorningCheckPanel>["stocks"];
  snapshots: React.ComponentProps<typeof SnapshotPanel>["snapshots"];
  autosaveSnapshots: React.ComponentProps<typeof SnapshotPanel>["autosaveSnapshots"];
  selectedStock: React.ComponentProps<typeof TimelinePanel>["stock"];
  selectedBacktestResult: React.ComponentProps<typeof DecisionReviewPanel>["backtestResult"];
  alertEvents: React.ComponentProps<typeof DecisionReviewPanel>["alerts"];
  compareSelection: React.ComponentProps<typeof ComparePanel>["compareSelection"];
  scoringConfig: React.ComponentProps<typeof CollapseSimulatorPanel>["scoringConfig"];
  onSaveSnapshots: React.ComponentProps<typeof SnapshotPanel>["onSave"];
  onToggleAutosave: React.ComponentProps<typeof SnapshotPanel>["onToggleAutosave"];
  onDeleteSnapshotCapture: React.ComponentProps<typeof SnapshotPanel>["onDeleteCapture"];
  onClearSnapshots: React.ComponentProps<typeof SnapshotPanel>["onClear"];
  onRunBacktest: React.ComponentProps<typeof BacktestPanel>["onRunBacktest"];
  onClearBacktestResults: React.ComponentProps<typeof BacktestPanel>["onClearResults"];
  backtestResults: React.ComponentProps<typeof BacktestPanel>["results"];
  onRemoveFromCompare: React.ComponentProps<typeof ComparePanel>["onRemove"];
  onClearCompare: React.ComponentProps<typeof ComparePanel>["onClear"];
  onOpenDetail: React.ComponentProps<typeof ComparePanel>["onOpenDetail"];
}

export function AnalysisTabSection({
  isPanelInTab,
  fallback,
  stocks,
  snapshots,
  autosaveSnapshots,
  selectedStock,
  selectedBacktestResult,
  alertEvents,
  compareSelection,
  scoringConfig,
  onSaveSnapshots,
  onToggleAutosave,
  onDeleteSnapshotCapture,
  onClearSnapshots,
  onRunBacktest,
  onClearBacktestResults,
  backtestResults,
  onRemoveFromCompare,
  onClearCompare,
  onOpenDetail
}: AnalysisTabSectionProps): JSX.Element {
  return (
    <div
      role="tabpanel"
      id="tabpanel-analysis"
      aria-labelledby="tab-analysis"
      className="flex flex-col gap-5 animate-fade-in"
    >
      <section className="rounded-xl border border-border-subtle bg-panel p-4 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-text-primary">AI Navigator</h2>
          <NavigatorLaunchButton />
        </div>
        <NavigatorResultsPanel />
      </section>

      {isPanelInTab("snapshot", "analysis") && (
        <Suspense fallback={fallback}>
          <SnapshotPanel
            snapshots={snapshots}
            autosaveSnapshots={autosaveSnapshots}
            onSave={onSaveSnapshots}
            onToggleAutosave={onToggleAutosave}
            onDeleteCapture={onDeleteSnapshotCapture}
            onClear={onClearSnapshots}
          />
        </Suspense>
      )}

      <Suspense fallback={fallback}>
        <MorningCheckPanel stocks={stocks} snapshots={snapshots} />
      </Suspense>

      <Suspense fallback={fallback}>
        <BacktestPanel
          stocks={stocks}
          results={backtestResults}
          onRunBacktest={onRunBacktest}
          onClearResults={onClearBacktestResults}
        />
      </Suspense>

      {isPanelInTab("timeline", "analysis") && (
        <Suspense fallback={fallback}>
          <TimelinePanel stock={selectedStock} snapshots={snapshots} />
        </Suspense>
      )}

      {isPanelInTab("compare", "analysis") && (
        <Suspense fallback={fallback}>
          <ComparePanel
            stocks={stocks}
            compareSelection={compareSelection}
            onRemove={onRemoveFromCompare}
            onClear={onClearCompare}
            onOpenDetail={onOpenDetail}
          />
        </Suspense>
      )}

      <Suspense fallback={fallback}>
        <DecisionReviewPanel
          stock={selectedStock}
          alerts={alertEvents}
          backtestResult={selectedBacktestResult}
        />
      </Suspense>

      <CollapseSimulatorPanel stock={selectedStock} scoringConfig={scoringConfig} />
      <ContrarianPanel stock={selectedStock} />
    </div>
  );
}
