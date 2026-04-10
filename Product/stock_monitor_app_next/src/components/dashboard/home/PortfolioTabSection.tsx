"use client";

import React, { Suspense } from "react";

import { ExportPanel } from "@/components/dashboard/ExportPanel";
import { ImportPanel } from "@/components/dashboard/ImportPanel";

import type { IsPanelInTab } from "./types";

const PortfolioPanel = React.lazy(() =>
  import("@/components/dashboard/PortfolioPanel").then((m) => ({ default: m.PortfolioPanel }))
);

interface PortfolioTabSectionProps {
  isPanelInTab: IsPanelInTab;
  fallback: React.ReactNode;
  onExportJson: React.ComponentProps<typeof ExportPanel>["onExportJson"];
  onExportSnapshotsCsv: React.ComponentProps<typeof ExportPanel>["onExportSnapshotsCsv"];
  onExportRankingCsv: React.ComponentProps<typeof ExportPanel>["onExportRankingCsv"];
  onExportPortfolioCsv: React.ComponentProps<typeof ExportPanel>["onExportPortfolioCsv"];
  preview: React.ComponentProps<typeof ExportPanel>["preview"];
}

export function PortfolioTabSection({
  isPanelInTab,
  fallback,
  onExportJson,
  onExportSnapshotsCsv,
  onExportRankingCsv,
  onExportPortfolioCsv,
  preview
}: PortfolioTabSectionProps): JSX.Element {
  return (
    <div
      role="tabpanel"
      id="tabpanel-portfolio"
      aria-labelledby="tab-portfolio"
      className="flex flex-col gap-5 animate-fade-in"
    >
      <Suspense fallback={fallback}>
        <PortfolioPanel />
      </Suspense>

      {isPanelInTab("export", "portfolio") && (
        <ExportPanel
          onExportJson={onExportJson}
          onExportSnapshotsCsv={onExportSnapshotsCsv}
          onExportRankingCsv={onExportRankingCsv}
          onExportPortfolioCsv={onExportPortfolioCsv}
          preview={preview}
        />
      )}

      <ImportPanel />
    </div>
  );
}
