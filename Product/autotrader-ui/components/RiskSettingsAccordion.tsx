"use client";

import { useEffect, useState } from "react";

import { fetchSettings, updateSettings } from "@/lib/api";
import type { AISelectionMode, RiskSettingsResponse, TradeMode } from "@/types/trader";

type OverrideMode = "auto" | "manual";

interface RiskSettingsDraft {
  limit_per_order: string;
  stop_loss_pct: string;
  max_qty_per_order: string;
  poll_interval_sec: string;
  ai_mode: AISelectionMode;
  trading_mode: TradeMode;
  available_cash: string;
  execution_feed: RiskSettingsResponse["execution_feed"];
  reference_feed: RiskSettingsResponse["reference_feed"];
  prioritize_manual_price_band: boolean;
  manual_price_min: string;
  manual_price_max: string;
  max_daily_orders: string;
  max_concurrent_positions: string;
  maxDailyOrdersMode: OverrideMode;
  maxConcurrentPositionsMode: OverrideMode;
  effective_max_daily_orders: number;
  effective_max_concurrent_positions: number;
}

const AI_MODE_OPTIONS: AISelectionMode[] = ["gemini", "hybrid"];
const TRADE_MODE_OPTIONS: TradeMode[] = ["conservative", "balanced", "aggressive"];
const FIELD_LABELS = {
  limit_per_order: "1回あたり上限金額",
  stop_loss_pct: "損切り率 (%)",
  max_qty_per_order: "1回あたり最大数量",
  poll_interval_sec: "送信間隔 (秒)",
  available_cash: "利用可能現金",
  ai_mode: "AI モード",
  trading_mode: "売買モード",
  prioritize_manual_price_band: "手動価格帯を優先",
  manual_price_min: "手動価格帯 下限",
  manual_price_max: "手動価格帯 上限",
  max_daily_orders: "1日あたり最大注文数",
  max_concurrent_positions: "同時保有上限",
  execution_feed: "執行フィード",
  reference_feed: "参照フィード"
} as const;

function getFieldLabel(key: keyof typeof FIELD_LABELS): string {
  return FIELD_LABELS[key];
}

function toDraft(settings: RiskSettingsResponse): RiskSettingsDraft {
  return {
    limit_per_order: String(settings.limit_per_order),
    stop_loss_pct: String(settings.stop_loss_pct),
    max_qty_per_order: String(settings.max_qty_per_order),
    poll_interval_sec: String(settings.poll_interval_sec),
    ai_mode: settings.ai_mode,
    trading_mode: settings.trading_mode,
    available_cash: String(settings.available_cash),
    execution_feed: settings.execution_feed,
    reference_feed: settings.reference_feed,
    prioritize_manual_price_band: settings.prioritize_manual_price_band,
    manual_price_min: String(settings.manual_price_min),
    manual_price_max: String(settings.manual_price_max),
    max_daily_orders: String(settings.max_daily_orders ?? settings.effective_max_daily_orders),
    max_concurrent_positions: String(
      settings.max_concurrent_positions ?? settings.effective_max_concurrent_positions
    ),
    maxDailyOrdersMode: settings.max_daily_orders === null ? "auto" : "manual",
    maxConcurrentPositionsMode: settings.max_concurrent_positions === null ? "auto" : "manual",
    effective_max_daily_orders: settings.effective_max_daily_orders,
    effective_max_concurrent_positions: settings.effective_max_concurrent_positions
  };
}

function parsePositiveInteger(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePositiveFloat(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toPayload(canonical: RiskSettingsResponse, draft: RiskSettingsDraft): RiskSettingsResponse {
  return {
    ...canonical,
    limit_per_order: parsePositiveInteger(draft.limit_per_order, canonical.limit_per_order),
    stop_loss_pct: parsePositiveFloat(draft.stop_loss_pct, canonical.stop_loss_pct),
    max_qty_per_order: parsePositiveInteger(draft.max_qty_per_order, canonical.max_qty_per_order),
    poll_interval_sec: parsePositiveInteger(draft.poll_interval_sec, canonical.poll_interval_sec),
    ai_mode: draft.ai_mode,
    trading_mode: draft.trading_mode,
    available_cash: parsePositiveInteger(draft.available_cash, canonical.available_cash),
    execution_feed: draft.execution_feed,
    reference_feed: draft.reference_feed,
    prioritize_manual_price_band: draft.prioritize_manual_price_band,
    manual_price_min: parsePositiveInteger(draft.manual_price_min, canonical.manual_price_min),
    manual_price_max: parsePositiveInteger(draft.manual_price_max, canonical.manual_price_max),
    max_daily_orders:
      draft.maxDailyOrdersMode === "auto"
        ? null
        : parsePositiveInteger(draft.max_daily_orders, canonical.effective_max_daily_orders),
    max_concurrent_positions:
      draft.maxConcurrentPositionsMode === "auto"
        ? null
        : parsePositiveInteger(
            draft.max_concurrent_positions,
            canonical.effective_max_concurrent_positions
          )
  };
}

interface NumberFieldProps {
  label: keyof Pick<
    RiskSettingsDraft,
    | "limit_per_order"
    | "stop_loss_pct"
    | "max_qty_per_order"
    | "poll_interval_sec"
    | "available_cash"
    | "manual_price_min"
    | "manual_price_max"
  >;
  draft: RiskSettingsDraft;
  disabled: boolean;
  onChange: (field: keyof RiskSettingsDraft, value: string) => void;
}

function NumberField({ label, draft, disabled, onChange }: NumberFieldProps): JSX.Element {
  const labelText = getFieldLabel(label);

  return (
    <label className="settings-field">
      <span>{labelText}</span>
      <input
        aria-label={labelText}
        type="number"
        value={draft[label]}
        disabled={disabled}
        onChange={(event) => onChange(label, event.target.value)}
      />
    </label>
  );
}

interface NullableOverrideFieldProps {
  field: "max_daily_orders" | "max_concurrent_positions";
  draft: RiskSettingsDraft;
  disabled: boolean;
  onValueChange: (field: keyof RiskSettingsDraft, value: string) => void;
  onModeChange: (field: "maxDailyOrdersMode" | "maxConcurrentPositionsMode", mode: OverrideMode) => void;
}

function NullableOverrideField({
  field,
  draft,
  disabled,
  onValueChange,
  onModeChange
}: NullableOverrideFieldProps): JSX.Element {
  const modeField = field === "max_daily_orders" ? "maxDailyOrdersMode" : "maxConcurrentPositionsMode";
  const fieldLabel = getFieldLabel(field);
  const effectiveValue =
    field === "max_daily_orders"
      ? draft.effective_max_daily_orders
      : draft.effective_max_concurrent_positions;
  const isAuto = draft[modeField] === "auto";

  return (
    <div className="settings-field settings-field--override">
      <div className="settings-field__header">
        <span>{fieldLabel}</span>
        <span className="settings-effective-value">実効値 {effectiveValue}</span>
      </div>
      <div className="settings-toggle-row">
        <button
          type="button"
          aria-label={`${fieldLabel} 自動`}
          className="settings-toggle"
          disabled={disabled}
          data-active={isAuto}
          onClick={() => onModeChange(modeField, "auto")}
        >
          自動
        </button>
        <button
          type="button"
          aria-label={`${fieldLabel} 手動`}
          className="settings-toggle"
          disabled={disabled}
          data-active={!isAuto}
          onClick={() => onModeChange(modeField, "manual")}
        >
          手動
        </button>
      </div>
      <input
        aria-label={fieldLabel}
        type="number"
        value={draft[field]}
        disabled={disabled || isAuto}
        onChange={(event) => onValueChange(field, event.target.value)}
      />
    </div>
  );
}

export function RiskSettingsAccordion(): JSX.Element {
  const [open, setOpen] = useState(false);
  const [canonical, setCanonical] = useState<RiskSettingsResponse | null>(null);
  const [draft, setDraft] = useState<RiskSettingsDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const settings = await fetchSettings();
        if (cancelled) {
          return;
        }

        setCanonical(settings);
        setDraft(toDraft(settings));
        setLoadError(null);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "設定の取得に失敗しました");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateDraft(field: keyof RiskSettingsDraft, value: string | boolean): void {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [field]: value
      } as RiskSettingsDraft;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!canonical || !draft) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const nextSettings = await updateSettings(toPayload(canonical, draft));
      setCanonical(nextSettings);
      setDraft(toDraft(nextSettings));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "設定の更新に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  const formDisabled = loading || saving || !!loadError || !draft;

  return (
    <section className="panel settings-panel">
      <div className="panel-heading-row">
        <div>
          <p className="panel-eyebrow">設定プロキシ</p>
          <h2>リスク設定</h2>
        </div>
        <button
          type="button"
          className="settings-expand-button"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          リスク設定
        </button>
      </div>

      {open ? (
        <form className="settings-form" onSubmit={handleSubmit}>
          {loadError ? <p className="settings-error">{loadError}</p> : null}
          {saveError ? <p className="settings-error">{saveError}</p> : null}

          {draft ? (
            <fieldset className="settings-fieldset" disabled={formDisabled}>
              <div className="settings-grid">
                <NumberField
                  label="limit_per_order"
                  draft={draft}
                  disabled={formDisabled}
                  onChange={updateDraft}
                />
                <NumberField
                  label="stop_loss_pct"
                  draft={draft}
                  disabled={formDisabled}
                  onChange={updateDraft}
                />
                <NumberField
                  label="max_qty_per_order"
                  draft={draft}
                  disabled={formDisabled}
                  onChange={updateDraft}
                />
                <NumberField
                  label="poll_interval_sec"
                  draft={draft}
                  disabled={formDisabled}
                  onChange={updateDraft}
                />
                <NumberField
                  label="available_cash"
                  draft={draft}
                  disabled={formDisabled}
                  onChange={updateDraft}
                />
                <label className="settings-field">
                  <span>{getFieldLabel("ai_mode")}</span>
                  <select
                    aria-label={getFieldLabel("ai_mode")}
                    value={draft.ai_mode}
                    disabled={formDisabled}
                    onChange={(event) => updateDraft("ai_mode", event.target.value)}
                  >
                    {AI_MODE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="settings-field">
                  <span>{getFieldLabel("trading_mode")}</span>
                  <select
                    aria-label={getFieldLabel("trading_mode")}
                    value={draft.trading_mode}
                    disabled={formDisabled}
                    onChange={(event) => updateDraft("trading_mode", event.target.value)}
                  >
                    {TRADE_MODE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="settings-field settings-field--checkbox">
                  <span>{getFieldLabel("prioritize_manual_price_band")}</span>
                  <input
                    aria-label={getFieldLabel("prioritize_manual_price_band")}
                    type="checkbox"
                    checked={draft.prioritize_manual_price_band}
                    disabled={formDisabled}
                    onChange={(event) => updateDraft("prioritize_manual_price_band", event.target.checked)}
                  />
                </label>
                <NumberField
                  label="manual_price_min"
                  draft={draft}
                  disabled={formDisabled}
                  onChange={updateDraft}
                />
                <NumberField
                  label="manual_price_max"
                  draft={draft}
                  disabled={formDisabled}
                  onChange={updateDraft}
                />
                <NullableOverrideField
                  field="max_daily_orders"
                  draft={draft}
                  disabled={formDisabled}
                  onValueChange={updateDraft}
                  onModeChange={updateDraft}
                />
                <NullableOverrideField
                  field="max_concurrent_positions"
                  draft={draft}
                  disabled={formDisabled}
                  onValueChange={updateDraft}
                  onModeChange={updateDraft}
                />
              </div>

              <div className="settings-feed-grid">
                <div className="settings-readonly-row">
                  <span>{getFieldLabel("execution_feed")}</span>
                  <strong>{draft.execution_feed}</strong>
                </div>
                <div className="settings-readonly-row">
                  <span>{getFieldLabel("reference_feed")}</span>
                  <strong>{draft.reference_feed}</strong>
                </div>
              </div>

              <div className="settings-actions">
                <button type="submit" className="settings-save-button" disabled={formDisabled}>
                  保存
                </button>
              </div>
            </fieldset>
          ) : (
            <>
              <p className="settings-muted-copy">{loading ? "設定を読み込み中" : "設定を利用できません"}</p>
              <div className="settings-actions">
                <button type="submit" className="settings-save-button" disabled>
                  保存
                </button>
              </div>
            </>
          )}
        </form>
      ) : null}
    </section>
  );
}