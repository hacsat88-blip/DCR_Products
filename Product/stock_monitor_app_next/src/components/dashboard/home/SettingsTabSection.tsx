"use client";

import React from "react";

import { AlertCenter } from "@/components/alerts/AlertCenter";
import { RuleManager } from "@/components/alerts/RuleManager";
import { DataSourceInfoPanel } from "@/components/dashboard/DataSourceInfoPanel";
import { SavedScreenPanel } from "@/components/dashboard/SavedScreenPanel";
import { ScoreTuningPanel } from "@/components/dashboard/ScoreTuningPanel";
import { StockOnboardingPanel } from "@/components/dashboard/StockOnboardingPanel";
import { SummaryBar } from "@/components/dashboard/SummaryBar";

import type { IsPanelInTab } from "./types";

interface SettingsTabSectionProps {
  isPanelInTab: IsPanelInTab;
  stocks: React.ComponentProps<typeof SummaryBar>["stocks"];
  allStocks: React.ComponentProps<typeof RuleManager>["stocks"];
  dataMode: React.ComponentProps<typeof SummaryBar>["dataMode"];
  sourceMeta: React.ComponentProps<typeof SummaryBar>["sourceMeta"];
  lastUpdatedAt: React.ComponentProps<typeof SummaryBar>["lastUpdatedAt"];
  fallbackStartedAt: React.ComponentProps<typeof SummaryBar>["fallbackStartedAt"];
  isLoading: React.ComponentProps<typeof SummaryBar>["isLoading"];
  isStale: React.ComponentProps<typeof SummaryBar>["isStale"];
  error: React.ComponentProps<typeof SummaryBar>["error"];
  fallbackReason: React.ComponentProps<typeof SummaryBar>["fallbackReason"];
  health: React.ComponentProps<typeof SummaryBar>["health"];
  scoringConfig: React.ComponentProps<typeof ScoreTuningPanel>["config"];
  filters: React.ComponentProps<typeof SavedScreenPanel>["filters"];
  sortKey: React.ComponentProps<typeof SavedScreenPanel>["sortKey"];
  rankingSortKey: React.ComponentProps<typeof SavedScreenPanel>["rankingSortKey"];
  compareCount: React.ComponentProps<typeof SavedScreenPanel>["compareCount"];
  savedScreens: React.ComponentProps<typeof SavedScreenPanel>["savedScreens"];
  alertRules: React.ComponentProps<typeof RuleManager>["rules"];
  alertEvents: React.ComponentProps<typeof AlertCenter>["events"];
  lastEvaluationAt: React.ComponentProps<typeof AlertCenter>["lastEvaluationAt"];
  notificationsEnabled: React.ComponentProps<typeof RuleManager>["notificationsEnabled"];
  notificationsAvailable: React.ComponentProps<typeof RuleManager>["notificationsAvailable"];
  notificationPermission: React.ComponentProps<typeof RuleManager>["notificationPermission"];
  onRefresh: React.ComponentProps<typeof SummaryBar>["onRefresh"];
  onSetScoringConfig: React.ComponentProps<typeof ScoreTuningPanel>["onChange"];
  onResetScoringConfig: React.ComponentProps<typeof ScoreTuningPanel>["onReset"];
  onSaveScreen: React.ComponentProps<typeof SavedScreenPanel>["onSave"];
  onUpdateSavedScreen: React.ComponentProps<typeof SavedScreenPanel>["onUpdate"];
  onDeleteSavedScreen: React.ComponentProps<typeof SavedScreenPanel>["onDelete"];
  onApplySavedScreen: React.ComponentProps<typeof SavedScreenPanel>["onApply"];
  onAddRule: React.ComponentProps<typeof RuleManager>["onAddRule"];
  onUpdateRule: React.ComponentProps<typeof RuleManager>["onUpdateRule"];
  onDeleteRule: React.ComponentProps<typeof RuleManager>["onDeleteRule"];
  onAddPresetRules: React.ComponentProps<typeof RuleManager>["onAddPreset"];
  onToggleNotifications: React.ComponentProps<typeof RuleManager>["onToggleNotifications"];
  onMarkAlertRead: React.ComponentProps<typeof AlertCenter>["onMarkRead"];
  onDismissAlert: React.ComponentProps<typeof AlertCenter>["onDismiss"];
  onClearAlerts: React.ComponentProps<typeof AlertCenter>["onClear"];
}

export function SettingsTabSection({
  isPanelInTab,
  stocks,
  allStocks,
  dataMode,
  sourceMeta,
  lastUpdatedAt,
  fallbackStartedAt,
  isLoading,
  isStale,
  error,
  fallbackReason,
  health,
  scoringConfig,
  filters,
  sortKey,
  rankingSortKey,
  compareCount,
  savedScreens,
  alertRules,
  alertEvents,
  lastEvaluationAt,
  notificationsEnabled,
  notificationsAvailable,
  notificationPermission,
  onRefresh,
  onSetScoringConfig,
  onResetScoringConfig,
  onSaveScreen,
  onUpdateSavedScreen,
  onDeleteSavedScreen,
  onApplySavedScreen,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
  onAddPresetRules,
  onToggleNotifications,
  onMarkAlertRead,
  onDismissAlert,
  onClearAlerts
}: SettingsTabSectionProps): JSX.Element {
  return (
    <div
      role="tabpanel"
      id="tabpanel-settings"
      aria-labelledby="tab-settings"
      className="flex flex-col gap-5 animate-fade-in"
    >
      <SummaryBar
        stocks={stocks}
        dataMode={dataMode}
        sourceMeta={sourceMeta}
        lastUpdatedAt={lastUpdatedAt}
        fallbackStartedAt={fallbackStartedAt}
        isLoading={isLoading}
        isStale={isStale}
        error={error}
        fallbackReason={fallbackReason}
        health={health}
        onRefresh={onRefresh}
      />

      <DataSourceInfoPanel health={health} />

      <ScoreTuningPanel config={scoringConfig} onChange={onSetScoringConfig} onReset={onResetScoringConfig} />

      {isPanelInTab("savedScreens", "settings") && (
        <SavedScreenPanel
          filters={filters}
          sortKey={sortKey}
          rankingSortKey={rankingSortKey}
          compareCount={compareCount}
          savedScreens={savedScreens}
          onSave={onSaveScreen}
          onUpdate={onUpdateSavedScreen}
          onDelete={onDeleteSavedScreen}
          onApply={onApplySavedScreen}
        />
      )}

      <StockOnboardingPanel />

      <RuleManager
        rules={alertRules}
        stocks={allStocks}
        notificationsEnabled={notificationsEnabled}
        notificationsAvailable={notificationsAvailable}
        notificationPermission={notificationPermission}
        onAddRule={onAddRule}
        onUpdateRule={onUpdateRule}
        onDeleteRule={onDeleteRule}
        onAddPreset={onAddPresetRules}
        onToggleNotifications={onToggleNotifications}
      />

      <AlertCenter
        events={alertEvents}
        stocks={allStocks}
        lastEvaluationAt={lastEvaluationAt}
        onMarkRead={onMarkAlertRead}
        onDismiss={onDismissAlert}
        onClear={onClearAlerts}
      />
    </div>
  );
}
