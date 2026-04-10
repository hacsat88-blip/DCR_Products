import { DataMode, ProviderHealth } from "@/services/providers/types";
import {
  AlertEngineInput,
  AlertEngineResult,
  AlertEvent,
  AlertRule,
  AlertRuleType,
  AlertSeverity,
  PreviousStockSnapshot
} from "@/types/alert";
import { EvaluatedStock } from "@/types/stock";

const DEFAULT_COOLDOWN_MINUTES = 30;
const DEFAULT_PRICE_STALE_MINUTES = 60;
const DEFAULT_FUNDAMENTALS_STALE_DAYS = 365;
export const ALERT_EVENTS_MAX = 200;

const PERSISTENT_RULE_TYPES = new Set<AlertRuleType>([
  "price_above",
  "price_below",
  "change_pct_above",
  "change_pct_below",
  "score_above",
  "score_below",
  "revenue_growth_above",
  "revenue_growth_below",
  "op_growth_above",
  "op_growth_below",
  "data_fallback",
  "price_stale",
  "fundamentals_stale",
  "provider_degraded"
]);

const DIFF_RULE_TYPES = new Set<AlertRuleType>([
  "score_delta",
  "action_changed",
  "action_upgraded_to_buy",
  "action_downgraded_to_exclude",
  "fundamentals_updated",
  "operating_cf_positive",
  "operating_cf_negative"
]);

const GLOBAL_ONLY_RULE_TYPES = new Set<AlertRuleType>(["data_fallback", "provider_degraded"]);

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function num(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseDate(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function applyTemplate(template: string, context: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(context)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}

function minutesSince(timestamp: string | null | undefined, nowMs: number): number | null {
  const ts = parseDate(timestamp);
  if (ts === null) return null;
  return (nowMs - ts) / (60 * 1000);
}

function daysSince(timestamp: string | null | undefined, nowMs: number): number | null {
  const ts = parseDate(timestamp);
  if (ts === null) return null;
  return (nowMs - ts) / (24 * 60 * 60 * 1000);
}

function findHealth(health: ProviderHealth[], provider: ProviderHealth["provider"]): ProviderHealth | null {
  return health.find((item) => item.provider === provider) ?? null;
}

function providerHealthSummary(health: ProviderHealth[]): string {
  return health
    .map((item) => `${item.provider}:${item.ok ? "ok" : "failed"}`)
    .sort((a, b) => a.localeCompare(b))
    .join(",");
}

function resolvePriceTimestamp(stock: EvaluatedStock, health: ProviderHealth[]): string | null {
  return (
    stock.priceUpdatedAt ??
    findHealth(health, "yahoo")?.sourceTimestamp ??
    findHealth(health, "alphaVantage")?.sourceTimestamp ??
    findHealth(health, "jquants")?.sourceTimestamp ??
    null
  );
}

function resolveFundamentalsTimestamp(stock: EvaluatedStock, health: ProviderHealth[]): string | null {
  return stock.fundamentalsUpdatedAt ?? findHealth(health, "edinetDb")?.sourceTimestamp ?? null;
}

function resolveFundamentalsSubmitDate(stock: EvaluatedStock, health: ProviderHealth[]): string | null {
  return stock.fundamentalsSubmitDate ?? stock.fundamentalsUpdatedAt ?? findHealth(health, "edinetDb")?.sourceTimestamp ?? null;
}

export function buildAlertSnapshots(
  stocks: EvaluatedStock[],
  dataMode: DataMode,
  health: ProviderHealth[],
  checkedAt: string
): Record<string, PreviousStockSnapshot> {
  const summary = providerHealthSummary(health);
  const next: Record<string, PreviousStockSnapshot> = {};
  for (const stock of stocks) {
    next[stock.code] = {
      code: stock.code,
      price: num(stock.price),
      changePercent: num(stock.changePercent),
      score: num(stock.score),
      evaluatedAction: stock.evaluatedAction ?? null,
      revenueGrowth: num(stock.revenueGrowth),
      opGrowth: num(stock.opGrowth),
      operatingCF: num(stock.operatingCF),
      dataMode,
      providerHealth: summary,
      priceUpdatedAt: resolvePriceTimestamp(stock, health),
      fundamentalsUpdatedAt: resolveFundamentalsTimestamp(stock, health),
      fundamentalsSubmitDate: resolveFundamentalsSubmitDate(stock, health),
      checkedAt
    };
  }
  return next;
}

export function buildAlertConditionBaseline(params: {
  stocks: EvaluatedStock[];
  rules: AlertRule[];
  dataMode: DataMode;
  health: ProviderHealth[];
  checkedAt: string;
  previousSnapshots?: Record<string, PreviousStockSnapshot>;
}): Record<string, boolean> {
  const nowMs = parseDate(params.checkedAt) ?? Date.now();
  const nextConditionState: Record<string, boolean> = {};
  const previousSnapshots = params.previousSnapshots ?? {};
  const input: AlertEngineInput = {
    stocks: params.stocks,
    rules: params.rules,
    existingEvents: [],
    previousSnapshots,
    conditionState: {},
    dataMode: params.dataMode,
    health: params.health,
    checkedAt: params.checkedAt
  };

  for (const rule of params.rules) {
    if (!rule.enabled || !isPersistentRule(rule.type) || isRuleInvalid(rule, params.stocks)) {
      continue;
    }
    const stocks = GLOBAL_ONLY_RULE_TYPES.has(rule.type)
      ? [undefined]
      : targetStocksByScope(rule, params.stocks);
    for (const stock of stocks) {
      const previous = stock ? previousSnapshots[stock.code] ?? null : null;
      const evaluated = evaluateRule(rule, stock, previous, input, nowMs);
      if (!evaluated) {
        continue;
      }
      const dedupeKey = dedupeKeyFor(rule, stock?.code, evaluated.condition);
      nextConditionState[dedupeKey] = evaluated.matched;
    }
  }

  return nextConditionState;
}

function isDiffRule(type: AlertRuleType): boolean {
  return DIFF_RULE_TYPES.has(type);
}

function isPersistentRule(type: AlertRuleType): boolean {
  return PERSISTENT_RULE_TYPES.has(type);
}

function severityForType(type: AlertRuleType, payload: Record<string, unknown>): AlertSeverity {
  if (type === "action_downgraded_to_exclude") return "critical";
  if (type === "provider_degraded") {
    const failedCount = Number(payload.failedCount ?? 0);
    return failedCount >= 2 ? "critical" : "warning";
  }
  if (type === "data_fallback" || type === "price_stale" || type === "fundamentals_stale") return "warning";
  if (type === "operating_cf_negative" || type === "score_below") return "warning";
  return "info";
}

function isWithinCooldown(
  events: AlertEvent[],
  dedupeKey: string,
  cooldownMinutes: number,
  nowMs: number
): boolean {
  const latest = events
    .filter((event) => event.dedupeKey === dedupeKey)
    .sort((a, b) => Date.parse(b.triggeredAt) - Date.parse(a.triggeredAt))[0];
  if (!latest) return false;
  const latestMs = parseDate(latest.triggeredAt);
  if (latestMs === null) return false;
  return nowMs - latestMs < cooldownMinutes * 60 * 1000;
}

function dedupeKeyFor(rule: AlertRule, stockCode: string | undefined, condition: string): string {
  return [rule.id, stockCode ?? "global", condition].join("|");
}

function targetStocksByScope(rule: AlertRule, stocks: EvaluatedStock[]): EvaluatedStock[] {
  const watchedFirst = [...stocks].sort((a, b) => Number(Boolean(b.watched)) - Number(Boolean(a.watched)));
  if (rule.scope === "stock") {
    return watchedFirst.filter((stock) => stock.code === rule.stockCode);
  }
  if (rule.scope === "watchlist") {
    return watchedFirst.filter((stock) => Boolean(stock.watched));
  }
  return watchedFirst;
}

function clearConditionStateByRule(ruleId: string, conditionState: Record<string, boolean>): void {
  for (const key of Object.keys(conditionState)) {
    if (key.startsWith(`${ruleId}|`)) {
      delete conditionState[key];
    }
  }
}

function isRuleInvalid(rule: AlertRule, stocks: EvaluatedStock[]): boolean {
  if (rule.scope !== "stock") {
    return false;
  }
  if (!rule.stockCode || !rule.stockCode.trim()) {
    return true;
  }
  return !stocks.some((stock) => stock.code === rule.stockCode);
}

type RuleEvaluation = {
  matched: boolean;
  condition: string;
  title: string;
  message: string;
  payload: Record<string, unknown>;
};

function threshold(rule: AlertRule, fallback: number): number {
  if (typeof rule.threshold === "number" && Number.isFinite(rule.threshold)) {
    return rule.threshold;
  }
  return fallback;
}

function normalizePriority(priority: AlertRule["priority"]): "high" | "medium" | "low" {
  if (priority === "high" || priority === "medium" || priority === "low") {
    return priority;
  }
  return "medium";
}

function normalizeDueDate(dueDate: string | null | undefined): string | null {
  if (typeof dueDate !== "string") {
    return null;
  }
  const trimmed = dueDate.trim();
  return trimmed ? trimmed : null;
}

function evaluateRule(
  rule: AlertRule,
  stock: EvaluatedStock | undefined,
  previous: PreviousStockSnapshot | null,
  input: AlertEngineInput,
  nowMs: number
): RuleEvaluation | null {
  const code = stock?.code ?? "GLOBAL";
  const name = stock?.name ?? "全銘柄";
  const currentPrice = stock ? num(stock.price) : null;
  const currentChangePct = stock ? num(stock.changePercent) : null;
  const currentScore = stock ? num(stock.score) : null;
  const currentRevenue = stock ? num(stock.revenueGrowth) : null;
  const currentOp = stock ? num(stock.opGrowth) : null;
  const currentCf = stock ? num(stock.operatingCF) : null;
  const currentAction = stock?.evaluatedAction ?? null;
  const currentPriceUpdated = stock ? resolvePriceTimestamp(stock, input.health) : null;
  const currentFundUpdated = stock ? resolveFundamentalsTimestamp(stock, input.health) : null;
  const currentFundSubmit = stock ? resolveFundamentalsSubmitDate(stock, input.health) : null;
  const modeChanged = Boolean(previous && previous.dataMode && previous.dataMode !== input.dataMode);

  switch (rule.type) {
    case "price_above": {
      const limit = threshold(rule, 0);
      const matched = currentPrice !== null && currentPrice >= limit;
      return {
        matched,
        condition: `price>=${limit}`,
        title: `${code} 価格上抜け`,
        message: `${name} の価格が ${limit} 以上です (${currentPrice ?? "-"})。`,
        payload: { currentPrice, threshold: limit }
      };
    }
    case "price_below": {
      const limit = threshold(rule, 0);
      const matched = currentPrice !== null && currentPrice <= limit;
      return {
        matched,
        condition: `price<=${limit}`,
        title: `${code} 押し目到達`,
        message: `${name} の価格が ${limit} 以下です (${currentPrice ?? "-"})。`,
        payload: { currentPrice, threshold: limit }
      };
    }
    case "change_pct_above": {
      const limit = threshold(rule, 0);
      const matched = currentChangePct !== null && currentChangePct >= limit;
      return {
        matched,
        condition: `change>=${limit}`,
        title: `${code} 前日比上振れ`,
        message: `${name} の前日比が ${limit}% 以上です (${currentChangePct ?? "-"}%)。`,
        payload: { currentChangePct, threshold: limit }
      };
    }
    case "change_pct_below": {
      const limit = threshold(rule, 0);
      const matched = currentChangePct !== null && currentChangePct <= limit;
      return {
        matched,
        condition: `change<=${limit}`,
        title: `${code} 前日比下振れ`,
        message: `${name} の前日比が ${limit}% 以下です (${currentChangePct ?? "-"}%)。`,
        payload: { currentChangePct, threshold: limit }
      };
    }
    case "score_above": {
      const limit = threshold(rule, 70);
      const matched = currentScore !== null && currentScore >= limit;
      return {
        matched,
        condition: `score>=${limit}`,
        title: `${code} スコア上昇`,
        message: `${name} の本命度スコアが ${limit} 以上です (${currentScore ?? "-"})。`,
        payload: { currentScore, threshold: limit }
      };
    }
    case "score_below": {
      const limit = threshold(rule, 40);
      const matched = currentScore !== null && currentScore <= limit;
      return {
        matched,
        condition: `score<=${limit}`,
        title: `${code} スコア低下`,
        message: `${name} の本命度スコアが ${limit} 以下です (${currentScore ?? "-"})。`,
        payload: { currentScore, threshold: limit }
      };
    }
    case "score_delta": {
      if (!previous || modeChanged) return null;
      if (currentScore === null || previous.score === null) return null;
      const delta = currentScore - previous.score;
      const limit = threshold(rule, -10);
      const matched = limit >= 0 ? delta >= limit : delta <= limit;
      return {
        matched,
        condition: `scoreDelta:${limit >= 0 ? "up" : "down"}:${limit}`,
        title: `${code} スコア差分`,
        message: `${name} のスコアが前回比 ${delta >= 0 ? "+" : ""}${delta.toFixed(1)} 変化しました。`,
        payload: { scoreDelta: delta, threshold: limit, previousScore: previous.score, currentScore }
      };
    }
    case "action_changed": {
      if (!previous || modeChanged) return null;
      if (!currentAction || !previous.evaluatedAction) return null;
      const matched = previous.evaluatedAction !== currentAction;
      return {
        matched,
        condition: `action:${previous.evaluatedAction}->${currentAction}`,
        title: `${code} 判定変更`,
        message: `${name} の判定が ${previous.evaluatedAction} から ${currentAction} に変化しました。`,
        payload: { previousAction: previous.evaluatedAction, currentAction }
      };
    }
    case "action_upgraded_to_buy": {
      if (!previous || modeChanged) return null;
      if (!currentAction || !previous.evaluatedAction) return null;
      const matched = currentAction === "buy_now" && previous.evaluatedAction !== "buy_now";
      return {
        matched,
        condition: `to_buy_from:${previous.evaluatedAction}`,
        title: `${code} buy_now 昇格`,
        message: `${name} が buy_now に昇格しました。`,
        payload: { previousAction: previous.evaluatedAction, currentAction }
      };
    }
    case "action_downgraded_to_exclude": {
      if (!previous || modeChanged) return null;
      if (!currentAction || !previous.evaluatedAction) return null;
      const matched = currentAction === "exclude" && previous.evaluatedAction !== "exclude";
      return {
        matched,
        condition: `to_exclude_from:${previous.evaluatedAction}`,
        title: `${code} exclude 悪化`,
        message: `${name} が exclude 判定へ悪化しました。`,
        payload: { previousAction: previous.evaluatedAction, currentAction }
      };
    }
    case "revenue_growth_above": {
      const limit = threshold(rule, 15);
      const matched = currentRevenue !== null && currentRevenue >= limit;
      return {
        matched,
        condition: `revenue>=${limit}`,
        title: `${code} 売上成長改善`,
        message: `${name} の売上成長率が ${limit}% 以上です (${currentRevenue ?? "-"}%)。`,
        payload: { currentRevenueGrowth: currentRevenue, threshold: limit }
      };
    }
    case "revenue_growth_below": {
      const limit = threshold(rule, 5);
      const matched = currentRevenue !== null && currentRevenue <= limit;
      return {
        matched,
        condition: `revenue<=${limit}`,
        title: `${code} 売上成長鈍化`,
        message: `${name} の売上成長率が ${limit}% 以下です (${currentRevenue ?? "-"}%)。`,
        payload: { currentRevenueGrowth: currentRevenue, threshold: limit }
      };
    }
    case "op_growth_above": {
      const limit = threshold(rule, 15);
      const matched = currentOp !== null && currentOp >= limit;
      return {
        matched,
        condition: `op>=${limit}`,
        title: `${code} 営業利益成長改善`,
        message: `${name} の営業利益成長率が ${limit}% 以上です (${currentOp ?? "-"}%)。`,
        payload: { currentOpGrowth: currentOp, threshold: limit }
      };
    }
    case "op_growth_below": {
      const limit = threshold(rule, 5);
      const matched = currentOp !== null && currentOp <= limit;
      return {
        matched,
        condition: `op<=${limit}`,
        title: `${code} 営業利益成長鈍化`,
        message: `${name} の営業利益成長率が ${limit}% 以下です (${currentOp ?? "-"}%)。`,
        payload: { currentOpGrowth: currentOp, threshold: limit }
      };
    }
    case "operating_cf_positive": {
      if (!previous) return null;
      const matched =
        currentCf !== null &&
        previous.operatingCF !== null &&
        previous.operatingCF <= 0 &&
        currentCf > 0;
      return {
        matched,
        condition: "operating_cf:negative_to_positive",
        title: `${code} 営業CF 正転`,
        message: `${name} の営業CFが正転しました。`,
        payload: { previousOperatingCF: previous.operatingCF, currentOperatingCF: currentCf }
      };
    }
    case "operating_cf_negative": {
      if (!previous) return null;
      const matched =
        currentCf !== null &&
        previous.operatingCF !== null &&
        previous.operatingCF >= 0 &&
        currentCf < 0;
      return {
        matched,
        condition: "operating_cf:positive_to_negative",
        title: `${code} 営業CF 悪化`,
        message: `${name} の営業CFが悪化しマイナスへ転じました。`,
        payload: { previousOperatingCF: previous.operatingCF, currentOperatingCF: currentCf }
      };
    }
    case "fundamentals_updated": {
      if (!previous) return null;
      if (!previous.fundamentalsSubmitDate || !currentFundSubmit) return null;
      const matched = previous.fundamentalsSubmitDate !== currentFundSubmit;
      return {
        matched,
        condition: `fundamentals:${previous.fundamentalsSubmitDate}->${currentFundSubmit}`,
        title: `${code} 決算データ更新`,
        message: `${name} の決算データ更新を検知しました (${currentFundSubmit})。`,
        payload: { previousSubmitDate: previous.fundamentalsSubmitDate, currentSubmitDate: currentFundSubmit }
      };
    }
    case "data_fallback": {
      const matched = input.dataMode === "fallback";
      return {
        matched,
        condition: "data_mode:fallback",
        title: "Data Mode fallback",
        message: "実データの一部取得に失敗して fallback 表示に切り替わっています。",
        payload: { dataMode: input.dataMode }
      };
    }
    case "price_stale": {
      const staleMinutes = threshold(rule, DEFAULT_PRICE_STALE_MINUTES);
      const elapsed = minutesSince(currentPriceUpdated, nowMs);
      const matched = elapsed !== null && elapsed >= staleMinutes;
      return {
        matched,
        condition: `price_stale>=${staleMinutes}m`,
        title: `${code} 価格データ stale`,
        message: `${name} の価格更新が古い可能性があります (${elapsed === null ? "-" : Math.floor(elapsed)}分経過)。`,
        payload: { priceUpdatedAt: currentPriceUpdated, staleMinutes, elapsedMinutes: elapsed }
      };
    }
    case "fundamentals_stale": {
      const staleDays = threshold(rule, DEFAULT_FUNDAMENTALS_STALE_DAYS);
      const elapsed = daysSince(currentFundUpdated, nowMs);
      const matched = elapsed !== null && elapsed >= staleDays;
      return {
        matched,
        condition: `fundamentals_stale>=${staleDays}d`,
        title: `${code} 財務データ stale`,
        message: `${name} の財務データ更新が古い可能性があります (${elapsed === null ? "-" : Math.floor(elapsed)}日経過)。`,
        payload: { fundamentalsUpdatedAt: currentFundUpdated, staleDays, elapsedDays: elapsed }
      };
    }
    case "provider_degraded": {
      const failedProviders = input.health.filter((item) => !item.ok).map((item) => item.provider);
      const matched = failedProviders.length > 0;
      return {
        matched,
        condition: "provider_degraded",
        title: "Provider health degraded",
        message: `データプロバイダの状態が劣化しています (${failedProviders.join(", ") || "none"})。`,
        payload: { failedProviders, failedCount: failedProviders.length }
      };
    }
    default:
      return null;
  }
}

function shouldSkipForInitial(
  rule: AlertRule,
  previous: PreviousStockSnapshot | null,
  previousSnapshots: Record<string, PreviousStockSnapshot>
): boolean {
  if (!isDiffRule(rule.type)) return false;
  if (Object.keys(previousSnapshots).length === 0) return true;
  return !previous;
}

function applyEventCap(events: AlertEvent[], maxItems: number): AlertEvent[] {
  const sorted = [...events].sort((a, b) => Date.parse(b.triggeredAt) - Date.parse(a.triggeredAt));
  const active = sorted.filter((event) => !event.read && !event.dismissed);
  const archived = sorted.filter((event) => event.read || event.dismissed);
  return [...active, ...archived].slice(0, maxItems);
}

export function evaluateAlerts(input: AlertEngineInput): AlertEngineResult {
  const nowMs = parseDate(input.checkedAt) ?? Date.now();
  const triggeredEvents: AlertEvent[] = [];
  const nextConditionState: Record<string, boolean> = { ...input.conditionState };
  const allEvents = [...input.existingEvents];

  for (const rule of input.rules) {
    if (!rule.enabled) {
      continue;
    }
    if (isRuleInvalid(rule, input.stocks)) {
      clearConditionStateByRule(rule.id, nextConditionState);
      continue;
    }

    const cooldown =
      typeof rule.cooldownMinutes === "number" && Number.isFinite(rule.cooldownMinutes)
        ? rule.cooldownMinutes
        : DEFAULT_COOLDOWN_MINUTES;
    const stocks = GLOBAL_ONLY_RULE_TYPES.has(rule.type)
      ? [undefined]
      : targetStocksByScope(rule, input.stocks);

    for (const stock of stocks) {
      const previous = stock ? input.previousSnapshots[stock.code] ?? null : null;
      if (shouldSkipForInitial(rule, previous, input.previousSnapshots)) {
        continue;
      }

      const evaluated = evaluateRule(rule, stock, previous, input, nowMs);
      if (!evaluated) {
        continue;
      }

      const dedupeKey = dedupeKeyFor(rule, stock?.code, evaluated.condition);
      const persistent = isPersistentRule(rule.type);

      if (persistent && !evaluated.matched) {
        nextConditionState[dedupeKey] = false;
        continue;
      }
      if (!evaluated.matched) {
        continue;
      }

      const wasActive = nextConditionState[dedupeKey] ?? false;
      const onCooldown = isWithinCooldown(allEvents, dedupeKey, cooldown, nowMs);

      if (persistent) {
        nextConditionState[dedupeKey] = true;
        if (wasActive || onCooldown) {
          continue;
        }
      } else if (onCooldown) {
        continue;
      }

      const severity = severityForType(rule.type, evaluated.payload);
      const context = {
        stockCode: stock?.code ?? "GLOBAL",
        stockName: stock?.name ?? "全銘柄",
        threshold: String(rule.threshold ?? ""),
        dataMode: input.dataMode
      };
      const message = rule.messageTemplate
        ? applyTemplate(rule.messageTemplate, context)
        : evaluated.message;

      const event: AlertEvent = {
        id: createId("event"),
        ruleId: rule.id,
        stockCode: stock?.code,
        title: evaluated.title,
        message,
        severity,
        triggeredAt: input.checkedAt,
        read: false,
        dismissed: false,
        dedupeKey,
        payload: {
          ...evaluated.payload,
          ruleType: rule.type,
          scope: rule.scope,
          dataMode: input.dataMode,
          priority: normalizePriority(rule.priority),
          dueDate: normalizeDueDate(rule.dueDate)
        }
      };

      triggeredEvents.push(event);
      allEvents.unshift(event);
    }
  }

  const snapshots = buildAlertSnapshots(input.stocks, input.dataMode, input.health, input.checkedAt);
  const events = applyEventCap([...triggeredEvents, ...input.existingEvents], ALERT_EVENTS_MAX);

  return {
    events,
    triggeredEvents,
    snapshots,
    conditionState: nextConditionState,
    lastEvaluationAt: input.checkedAt
  };
}
