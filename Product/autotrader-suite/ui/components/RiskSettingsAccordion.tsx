"use client";

import { useEffect, useState } from "react";

import { fetchSettings, updateSettings } from "@/lib/api";
import { getAiModeLabel, getFeedSourceLabel, getTradeModeLabel } from "@/lib/trader-display";
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
  max_daily_loss_yen: string;
  max_consecutive_losses: string;
  cooldown_minutes_after_loss: string;
  min_five_bar_range_pct: string;
  min_last_bar_volume_ratio: string;
  max_reference_gap_pct: string;
  flat_before_close_minutes: string;
  max_spread_bps: string;
  skip_open_minutes: string;
  maxDailyOrdersMode: OverrideMode;
  maxConcurrentPositionsMode: OverrideMode;
  effective_max_daily_orders: number;
  effective_max_concurrent_positions: number;
}

const AI_MODE_OPTIONS: AISelectionMode[] = ["gemini"];
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
  max_daily_loss_yen: "日次損失上限 (円)",
  max_consecutive_losses: "最大連敗数",
  cooldown_minutes_after_loss: "損失後クールダウン (分)",
  min_five_bar_range_pct: "最小5本レンジ (%)",
  min_last_bar_volume_ratio: "直近出来高倍率",
  max_reference_gap_pct: "参照乖離上限 (%)",
  flat_before_close_minutes: "引け前手仕舞い (分前)",
  max_spread_bps: "最大スプレッド (bps)",
  skip_open_minutes: "寄り付き停止 (分)",
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
    max_daily_loss_yen: String(settings.max_daily_loss_yen),
    max_consecutive_losses: String(settings.max_consecutive_losses),
    cooldown_minutes_after_loss: String(settings.cooldown_minutes_after_loss),
    min_five_bar_range_pct: String(settings.min_five_bar_range_pct),
    min_last_bar_volume_ratio: String(settings.min_last_bar_volume_ratio),
    max_reference_gap_pct: String(settings.max_reference_gap_pct),
    flat_before_close_minutes: String(settings.flat_before_close_minutes),
    max_spread_bps: String(settings.max_spread_bps),
    skip_open_minutes: String(settings.skip_open_minutes),
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

function parseNonNegativeInteger(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parsePositiveFloat(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeFloat(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
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
          ),
    max_daily_loss_yen: parsePositiveInteger(
      draft.max_daily_loss_yen,
      canonical.max_daily_loss_yen
    ),
    max_consecutive_losses: parsePositiveInteger(
      draft.max_consecutive_losses,
      canonical.max_consecutive_losses
    ),
    cooldown_minutes_after_loss: parseNonNegativeInteger(
      draft.cooldown_minutes_after_loss,
      canonical.cooldown_minutes_after_loss
    ),
    min_five_bar_range_pct: parseNonNegativeFloat(
      draft.min_five_bar_range_pct,
      canonical.min_five_bar_range_pct
    ),
    min_last_bar_volume_ratio: parseNonNegativeFloat(
      draft.min_last_bar_volume_ratio,
      canonical.min_last_bar_volume_ratio
    ),
    max_reference_gap_pct: parsePositiveFloat(
      draft.max_reference_gap_pct,
      canonical.max_reference_gap_pct
    ),
    flat_before_close_minutes: parsePositiveInteger(
      draft.flat_before_close_minutes,
      canonical.flat_before_close_minutes
    ),
    max_spread_bps: parsePositiveFloat(draft.max_spread_bps, canonical.max_spread_bps),
    skip_open_minutes: parseNonNegativeInteger(
      draft.skip_open_minutes,
      canonical.skip_open_minutes
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
    | "max_daily_loss_yen"
    | "max_consecutive_losses"
    | "cooldown_minutes_after_loss"
    | "min_five_bar_range_pct"
    | "min_last_bar_volume_ratio"
    | "max_reference_gap_pct"
    | "flat_before_close_minutes"
    | "max_spread_bps"
    | "skip_open_minutes"
  >;
  draft: RiskSettingsDraft;
  disabled: boolean;
  onChange: (field: keyof RiskSettingsDraft, value: string) => void;
}

function NumberField({ label, draft, disabled, onChange }: NumberFieldProps): JSX.Element {
  const labelText = getFieldLabel(label);
  const helperText =
    label === "poll_interval_sec"
      ? "実際の送信間隔は workbook の Control!B2 が正本です。ここは backend 側設定の表示・保存用です。"
      : null;

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
      {helperText ? <small>{helperText}</small> : null}
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
                    disabled={true}
                    onChange={(event) => updateDraft("ai_mode", event.target.value)}
                  >
                    {AI_MODE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {getAiModeLabel(option)}
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
                        {getTradeModeLabel(option)}
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
                <NumberField
                  label="max_daily_loss_yen"
                  draft={draft}
                  disabled={formDisabled}
                  onChange={updateDraft}
                />
                <NumberField
                  label="max_consecutive_losses"
                  draft={draft}
                  disabled={formDisabled}
                  onChange={updateDraft}
                />
                <NumberField
                  label="cooldown_minutes_after_loss"
                  draft={draft}
                  disabled={formDisabled}
                  onChange={updateDraft}
                />
                <NumberField
                  label="min_five_bar_range_pct"
                  draft={draft}
                  disabled={formDisabled}
                  onChange={updateDraft}
                />
                <NumberField
                  label="min_last_bar_volume_ratio"
                  draft={draft}
                  disabled={formDisabled}
                  onChange={updateDraft}
                />
                <NumberField
                  label="max_reference_gap_pct"
                  draft={draft}
                  disabled={formDisabled}
                  onChange={updateDraft}
                />
                <NumberField
                  label="flat_before_close_minutes"
                  draft={draft}
                  disabled={formDisabled}
                  onChange={updateDraft}
                />
                <NumberField
                  label="max_spread_bps"
                  draft={draft}
                  disabled={formDisabled}
                  onChange={updateDraft}
                />
                <NumberField
                  label="skip_open_minutes"
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
                  <strong>{getFeedSourceLabel(draft.execution_feed)}</strong>
                </div>
                <div className="settings-readonly-row">
                  <span>{getFieldLabel("reference_feed")}</span>
                  <strong>{getFeedSourceLabel(draft.reference_feed)}</strong>
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