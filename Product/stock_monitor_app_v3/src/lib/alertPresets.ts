import { AlertRule, AlertRuleType } from "@/types/alert";

export type AlertPresetId = "defensive" | "aggressive" | "earnings";

interface RuleTemplate {
  scope: AlertRule["scope"];
  type: AlertRule["type"];
  threshold?: number;
  cooldownMinutes?: number;
  messageTemplate?: string;
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toRule(template: RuleTemplate, now: string): AlertRule {
  return {
    id: createId("rule"),
    stockCode: undefined,
    scope: template.scope,
    type: template.type,
    enabled: true,
    threshold: template.threshold,
    messageTemplate: template.messageTemplate,
    cooldownMinutes: template.cooldownMinutes ?? 30,
    priority: "medium",
    dueDate: null,
    createdAt: now,
    updatedAt: now
  };
}

export const ALERT_RULE_TYPE_LABELS: Record<AlertRuleType, string> = {
  price_above: "価格が閾値以上",
  price_below: "価格が閾値以下",
  change_pct_above: "前日比が閾値%以上",
  change_pct_below: "前日比が閾値%以下",
  score_above: "スコアが閾値以上",
  score_below: "スコアが閾値以下",
  score_delta: "スコア差分",
  action_changed: "判定アクション変更",
  action_upgraded_to_buy: "buy_now へ昇格",
  action_downgraded_to_exclude: "exclude へ悪化",
  revenue_growth_above: "売上成長が閾値以上",
  revenue_growth_below: "売上成長が閾値以下",
  op_growth_above: "営業利益成長が閾値以上",
  op_growth_below: "営業利益成長が閾値以下",
  operating_cf_positive: "営業CFが正転",
  operating_cf_negative: "営業CFが悪化",
  fundamentals_updated: "決算データ更新",
  data_fallback: "dataMode が fallback",
  price_stale: "価格データ stale",
  fundamentals_stale: "財務データ stale",
  provider_degraded: "provider degraded"
};

export const ALERT_PRESET_CATALOG: Record<
  AlertPresetId,
  { id: AlertPresetId; name: string; description: string; rules: RuleTemplate[] }
> = {
  defensive: {
    id: "defensive",
    name: "守り preset",
    description: "劣化検知を優先し、壊れを先に察知する",
    rules: [
      { scope: "global", type: "data_fallback", cooldownMinutes: 20 },
      { scope: "global", type: "price_stale", threshold: 60, cooldownMinutes: 120 },
      { scope: "global", type: "fundamentals_stale", threshold: 365, cooldownMinutes: 720 },
      { scope: "global", type: "action_downgraded_to_exclude", cooldownMinutes: 5 },
      { scope: "global", type: "operating_cf_negative", cooldownMinutes: 15 },
      { scope: "global", type: "score_delta", threshold: -10, cooldownMinutes: 30 }
    ]
  },
  aggressive: {
    id: "aggressive",
    name: "攻め preset",
    description: "上方変化と押し目機会を早めに捉える",
    rules: [
      { scope: "global", type: "action_upgraded_to_buy", cooldownMinutes: 10 },
      { scope: "global", type: "score_delta", threshold: 8, cooldownMinutes: 30 },
      { scope: "global", type: "price_below", threshold: 300, cooldownMinutes: 30 },
      { scope: "global", type: "revenue_growth_above", threshold: 20, cooldownMinutes: 120 },
      { scope: "global", type: "op_growth_above", threshold: 20, cooldownMinutes: 120 }
    ]
  },
  earnings: {
    id: "earnings",
    name: "決算監視 preset",
    description: "決算更新と成長率・CFの変化を検知する",
    rules: [
      { scope: "global", type: "fundamentals_updated", cooldownMinutes: 180 },
      { scope: "global", type: "revenue_growth_above", threshold: 15, cooldownMinutes: 180 },
      { scope: "global", type: "revenue_growth_below", threshold: 5, cooldownMinutes: 180 },
      { scope: "global", type: "op_growth_above", threshold: 15, cooldownMinutes: 180 },
      { scope: "global", type: "op_growth_below", threshold: 5, cooldownMinutes: 180 },
      { scope: "global", type: "operating_cf_positive", cooldownMinutes: 180 },
      { scope: "global", type: "operating_cf_negative", cooldownMinutes: 180 }
    ]
  }
};

export function createInitialAlertRules(now: string): AlertRule[] {
  const templates: RuleTemplate[] = [
    { scope: "global", type: "data_fallback", cooldownMinutes: 20 },
    { scope: "global", type: "action_upgraded_to_buy", cooldownMinutes: 10 },
    { scope: "global", type: "action_downgraded_to_exclude", cooldownMinutes: 10 },
    { scope: "global", type: "price_stale", threshold: 60, cooldownMinutes: 120 },
    { scope: "global", type: "fundamentals_stale", threshold: 365, cooldownMinutes: 720 },
    { scope: "global", type: "score_delta", threshold: -10, cooldownMinutes: 30 }
  ];
  return templates.map((template) => toRule(template, now));
}

export function createRulesFromPreset(presetId: AlertPresetId, now: string): AlertRule[] {
  const preset = ALERT_PRESET_CATALOG[presetId];
  return preset.rules.map((rule) => toRule(rule, now));
}

export function defaultRuleThreshold(type: AlertRuleType): number | undefined {
  if (type === "score_delta") return -10;
  if (type === "score_above") return 70;
  if (type === "score_below") return 40;
  if (type === "price_above") return 1000;
  if (type === "price_below") return 300;
  if (type === "change_pct_above") return 5;
  if (type === "change_pct_below") return -5;
  if (type === "revenue_growth_above") return 15;
  if (type === "revenue_growth_below") return 5;
  if (type === "op_growth_above") return 15;
  if (type === "op_growth_below") return 5;
  if (type === "price_stale") return 60;
  if (type === "fundamentals_stale") return 365;
  return undefined;
}
