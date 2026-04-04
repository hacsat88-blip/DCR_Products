import { DataMode, ProviderHealth } from "@/services/providers/types";
import { EvaluatedStock } from "@/types/stock";

export type AlertScope = "global" | "watchlist" | "stock";

export type AlertRuleType =
  | "price_above"
  | "price_below"
  | "change_pct_above"
  | "change_pct_below"
  | "score_above"
  | "score_below"
  | "score_delta"
  | "action_changed"
  | "action_upgraded_to_buy"
  | "action_downgraded_to_exclude"
  | "revenue_growth_above"
  | "revenue_growth_below"
  | "op_growth_above"
  | "op_growth_below"
  | "operating_cf_positive"
  | "operating_cf_negative"
  | "fundamentals_updated"
  | "data_fallback"
  | "price_stale"
  | "fundamentals_stale"
  | "provider_degraded";

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertPriority = "high" | "medium" | "low";

export interface AlertRule {
  id: string;
  stockCode?: string;
  scope: AlertScope;
  type: AlertRuleType;
  enabled: boolean;
  threshold?: number;
  messageTemplate?: string;
  cooldownMinutes?: number;
  priority?: AlertPriority;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AlertEventPayload {
  ruleType: AlertRuleType;
  scope: AlertScope;
  dataMode?: DataMode;
  priority: AlertPriority;
  dueDate?: string | null;
  currentValue?: number | null;
  previousValue?: number | null;
  threshold?: number | null;
  stockCode?: string;
  [key: string]: unknown;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  stockCode?: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  triggeredAt: string;
  read: boolean;
  dismissed: boolean;
  dedupeKey?: string;
  payload?: AlertEventPayload;
}

export interface PreviousStockSnapshot {
  code: string;
  price: number | null;
  changePercent: number | null;
  score: number | null;
  evaluatedAction: string | null;
  revenueGrowth: number | null;
  opGrowth: number | null;
  operatingCF: number | null;
  dataMode: string | null;
  providerHealth: string | null;
  priceUpdatedAt?: string | null;
  fundamentalsUpdatedAt?: string | null;
  fundamentalsSubmitDate?: string | null;
  checkedAt: string;
}

export interface AlertEngineInput {
  stocks: EvaluatedStock[];
  rules: AlertRule[];
  existingEvents: AlertEvent[];
  previousSnapshots: Record<string, PreviousStockSnapshot>;
  conditionState: Record<string, boolean>;
  dataMode: DataMode;
  health: ProviderHealth[];
  checkedAt: string;
}

export interface AlertEngineResult {
  events: AlertEvent[];
  triggeredEvents: AlertEvent[];
  snapshots: Record<string, PreviousStockSnapshot>;
  conditionState: Record<string, boolean>;
  lastEvaluationAt: string;
}
