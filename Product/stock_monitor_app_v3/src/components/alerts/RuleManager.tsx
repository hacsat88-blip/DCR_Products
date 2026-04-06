"use client";

import { useEffect, useMemo, useState } from "react";

import { ALERT_PRESET_CATALOG, ALERT_RULE_TYPE_LABELS } from "@/lib/alertPresets";
import { AlertPresetId } from "@/lib/alertPresets";
import { AlertRule, AlertRuleType } from "@/types/alert";
import { EvaluatedStock } from "@/types/stock";

interface RuleManagerProps {
  rules: AlertRule[];
  stocks: EvaluatedStock[];
  notificationsEnabled: boolean;
  notificationsAvailable: boolean;
  notificationPermission: NotificationPermission | "unsupported";
  onAddRule: (rule: Partial<Omit<AlertRule, "id" | "createdAt" | "updatedAt">>) => void;
  onUpdateRule: (ruleId: string, patch: Partial<AlertRule>) => void;
  onDeleteRule: (ruleId: string) => void;
  onAddPreset: (presetId: AlertPresetId) => void;
  onToggleNotifications: () => void;
}

export function RuleManager({
  rules,
  stocks,
  notificationsEnabled,
  notificationsAvailable,
  notificationPermission,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
  onAddPreset,
  onToggleNotifications
}: RuleManagerProps): JSX.Element {
  const [type, setType] = useState<AlertRuleType>("score_delta");
  const [scope, setScope] = useState<AlertRule["scope"]>("global");
  const [stockCode, setStockCode] = useState<string>(stocks[0]?.code ?? "");
  const [threshold, setThreshold] = useState<string>("-10");
  const [cooldown, setCooldown] = useState<string>("30");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [dueDate, setDueDate] = useState<string>("");
  const canAddRule = scope !== "stock" || (scope === "stock" && Boolean(stockCode));

  useEffect(() => {
    if (!stockCode && stocks.length > 0) {
      setStockCode(stocks[0].code);
    }
  }, [stockCode, stocks]);

  const sortedRules = useMemo(
    () => [...rules].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    [rules]
  );
  const notificationStatus = useMemo(() => {
    if (!notificationsEnabled) {
      return "希望: OFF / 実効: OFF";
    }
    if (notificationsAvailable) {
      return "希望: ON / 実効: ON";
    }
    if (notificationPermission === "denied") {
      return "希望: ON / 実効: OFF（権限未許可）";
    }
    if (notificationPermission === "default") {
      return "希望: ON / 実効: OFF（許可待ち）";
    }
    return "希望: ON / 実効: OFF（ブラウザ未対応）";
  }, [notificationPermission, notificationsAvailable, notificationsEnabled]);

  return (
    <section className="rounded-lg border border-border-subtle bg-panel p-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold font-semiboldtext-text-primary">アラートルール管理</h2>
        <button
          type="button"
          onClick={onToggleNotifications}
          className="rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-slate-200"
        >
          ブラウザ通知 設定変更
        </button>
      </div>
      <p className="mb-3 text-xs text-text-secondary">{notificationStatus}</p>

      <div className="mb-4 grid gap-2 md:grid-cols-3">
        {Object.values(ALERT_PRESET_CATALOG).map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onAddPreset(preset.id)}
            className="rounded-lg border border-border-subtle bg-canvas-deep/60 px-3 py-3 text-left"
          >
            <p className="text-sm font-semibold text-text-primary">{preset.name}</p>
            <p className="mt-1 text-xs leading-5 text-text-muted">{preset.description}</p>
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border-subtle bg-canvas-deep/60 p-3">
        <p className="text-sm font-semibold text-text-primary">個別ルール追加</p>
        <div className="mt-3 grid gap-2 md:grid-cols-4 xl:grid-cols-7">
          <select
            value={type}
            onChange={(event) => setType(event.target.value as AlertRuleType)}
            className="rounded-lg border border-border-subtle bg-canvas/90 px-2 py-2 text-xs text-text-primary"
          >
            {Object.entries(ALERT_RULE_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={scope}
            onChange={(event) => setScope(event.target.value as AlertRule["scope"])}
            className="rounded-lg border border-border-subtle bg-canvas/90 px-2 py-2 text-xs text-text-primary"
          >
            <option value="global">全体</option>
            <option value="stock">銘柄単位</option>
            <option value="watchlist">ウォッチリスト</option>
          </select>

          <select
            value={stockCode}
            onChange={(event) => setStockCode(event.target.value)}
            disabled={scope !== "stock"}
            className="rounded-lg border border-border-subtle bg-canvas/90 px-2 py-2 text-xs text-text-primary disabled:opacity-50"
          >
            {stocks.map((stock) => (
              <option key={stock.code} value={stock.code}>
                {stock.code} {stock.name}
              </option>
            ))}
          </select>

          <input
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            placeholder="閾値"
            className="rounded-lg border border-border-subtle bg-canvas/90 px-2 py-2 text-xs text-text-primary"
          />

          <input
            value={cooldown}
            onChange={(event) => setCooldown(event.target.value)}
            placeholder="再通知間隔(分)"
            className="rounded-lg border border-border-subtle bg-canvas/90 px-2 py-2 text-xs text-text-primary"
          />

          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as "high" | "medium" | "low")}
            className="rounded-lg border border-border-subtle bg-canvas/90 px-2 py-2 text-xs text-text-primary"
          >
            <option value="high">優先度: 高</option>
            <option value="medium">優先度: 中</option>
            <option value="low">優先度: 低</option>
          </select>

          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className="rounded-lg border border-border-subtle bg-canvas/90 px-2 py-2 text-xs text-text-primary"
          />
        </div>
        <button
          type="button"
          disabled={!canAddRule}
          className="mt-3 rounded-lg border border-secondary/40 bg-secondary/10 px-3 py-2 text-xs font-semibold text-secondary disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() =>
            onAddRule({
              type,
              scope,
              stockCode: scope === "stock" ? stockCode : undefined,
              threshold: threshold.trim() === "" ? undefined : Number(threshold),
              cooldownMinutes: cooldown.trim() === "" ? 30 : Number(cooldown),
              priority,
              dueDate: dueDate.trim() === "" ? null : dueDate,
              enabled: true
            })
          }
        >
          ルール追加
        </button>
        {scope === "stock" && !stockCode ? (
          <p className="mt-2 text-xs text-amber">銘柄単位では銘柄コード選択が必須です。</p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2">
        {sortedRules.map((rule) => (
          <article
            key={rule.id}
            className="rounded-lg border border-border-subtle bg-canvas-deep/50 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-text-primary">{ALERT_RULE_TYPE_LABELS[rule.type]}</p>
              <button
                type="button"
                onClick={() => onDeleteRule(rule.id)}
                className="rounded-lg border border-border-subtle px-2 py-1 text-xs text-slate-200"
              >
                削除
              </button>
            </div>
            {rule.scope === "stock" && (!rule.stockCode || !stocks.some((stock) => stock.code === rule.stockCode)) ? (
              <p className="mt-2 text-xs text-amber">無効: stockCode が未設定または現在銘柄に存在しません</p>
            ) : null}

            <div className="mt-2 grid gap-2 text-xs md:grid-cols-7">
              <label className="flex items-center gap-2 text-text-secondary">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(event) => onUpdateRule(rule.id, { enabled: event.target.checked })}
                />
                有効
              </label>

              <select
                value={rule.scope}
                onChange={(event) =>
                  onUpdateRule(rule.id, {
                    scope: event.target.value as AlertRule["scope"],
                    stockCode: event.target.value === "stock" ? rule.stockCode ?? stocks[0]?.code : undefined
                  })
                }
                className="rounded-lg border border-border-subtle bg-canvas/90 px-2 py-1 text-xs text-text-primary"
              >
                <option value="global">全体</option>
                <option value="stock">銘柄単位</option>
                <option value="watchlist">ウォッチリスト</option>
              </select>

              <select
                value={rule.stockCode ?? ""}
                disabled={rule.scope !== "stock"}
                onChange={(event) => onUpdateRule(rule.id, { stockCode: event.target.value })}
                className="rounded-lg border border-border-subtle bg-canvas/90 px-2 py-1 text-xs text-text-primary disabled:opacity-50"
              >
                <option value="">-</option>
                {stocks.map((stock) => (
                  <option key={stock.code} value={stock.code}>
                    {stock.code} {stock.name}
                  </option>
                ))}
              </select>

              <input
                value={rule.threshold ?? ""}
                onChange={(event) =>
                  onUpdateRule(rule.id, {
                    threshold: event.target.value === "" ? undefined : Number(event.target.value)
                  })
                }
                className="rounded-lg border border-border-subtle bg-canvas/90 px-2 py-1 text-xs text-text-primary"
              />

              <input
                value={rule.cooldownMinutes ?? ""}
                onChange={(event) =>
                  onUpdateRule(rule.id, {
                    cooldownMinutes: event.target.value === "" ? 30 : Number(event.target.value)
                  })
                }
                className="rounded-lg border border-border-subtle bg-canvas/90 px-2 py-1 text-xs text-text-primary"
              />

              <select
                value={rule.priority ?? "medium"}
                onChange={(event) =>
                  onUpdateRule(rule.id, { priority: event.target.value as "high" | "medium" | "low" })
                }
                className="rounded-lg border border-border-subtle bg-canvas/90 px-2 py-1 text-xs text-text-primary"
              >
                <option value="high">優先:高</option>
                <option value="medium">優先:中</option>
                <option value="low">優先:低</option>
              </select>

              <input
                type="date"
                value={rule.dueDate ?? ""}
                onChange={(event) =>
                  onUpdateRule(rule.id, {
                    dueDate: event.target.value.trim() === "" ? null : event.target.value
                  })
                }
                className="rounded-lg border border-border-subtle bg-canvas/90 px-2 py-1 text-xs text-text-primary"
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
