import type { AlertRule } from "@/store/useAlertsStore";

export interface AlertSnapshot {
  price: number;
  prevPrice?: number;
  changePct?: number;
}

export interface AlertEvaluation {
  triggered: boolean;
  reason?: string;
}

function currentValue(rule: AlertRule, snapshot: AlertSnapshot): number | null {
  if (rule.condition.field === "price") return snapshot.price;
  if (rule.condition.field === "changePct") {
    if (typeof snapshot.changePct === "number") return snapshot.changePct;
    if (typeof snapshot.prevPrice === "number" && snapshot.prevPrice !== 0) {
      return (snapshot.price / snapshot.prevPrice - 1) * 100;
    }
    return null;
  }
  return null;
}

function previousValue(rule: AlertRule, snapshot: AlertSnapshot): number | null {
  if (rule.condition.field === "price") {
    return typeof snapshot.prevPrice === "number" ? snapshot.prevPrice : null;
  }
  // changePct の前回値は snapshot に含めないため cross_* は非対応
  return null;
}

export function evaluateRule(rule: AlertRule, snapshot: AlertSnapshot): AlertEvaluation {
  const target = rule.condition.target;
  const curr = currentValue(rule, snapshot);
  if (curr == null || !Number.isFinite(curr)) {
    return { triggered: false };
  }
  const op = rule.condition.op;

  if (op === ">=") {
    if (curr >= target) return { triggered: true, reason: `${curr} >= ${target}` };
    return { triggered: false };
  }
  if (op === "<=") {
    if (curr <= target) return { triggered: true, reason: `${curr} <= ${target}` };
    return { triggered: false };
  }

  const prev = previousValue(rule, snapshot);
  if (prev == null) return { triggered: false };

  if (op === "cross_up") {
    if (prev < target && curr >= target) {
      return { triggered: true, reason: `cross up ${prev} → ${curr} 越え ${target}` };
    }
    return { triggered: false };
  }
  if (op === "cross_down") {
    if (prev > target && curr <= target) {
      return { triggered: true, reason: `cross down ${prev} → ${curr} 下抜け ${target}` };
    }
    return { triggered: false };
  }
  return { triggered: false };
}
