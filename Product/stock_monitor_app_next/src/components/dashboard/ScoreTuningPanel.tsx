"use client";

import { DEFAULT_SCORING_CONFIG } from"@/lib/scoring";
import { ScoringConfig } from"@/types/scoring";

interface ScoreTuningPanelProps {
 config: ScoringConfig;
 onChange: (patch: Partial<ScoringConfig>) => void;
 onReset: () => void;
}

interface ConfigField {
 key: keyof ScoringConfig;
 label: string;
 helper: string;
}

const FIELDS: ConfigField[] = [
 { key:"revenueGrowthThreshold", label:"売上成長 閾値", helper:"この値を超えると加点対象" },
 { key:"revenueGrowthWeight", label:"売上成長 重み", helper:"加点幅" },
 { key:"opGrowthThreshold", label:"営業利益成長 閾値", helper:"この値を超えると加点対象" },
 { key:"opGrowthWeight", label:"営業利益成長 重み", helper:"加点幅" },
 { key:"operatingCFBonus", label:"営業CFプラス時ボーナス", helper:"営業CFが正なら加点" },
 { key:"perPenaltyThreshold", label:"PER 減点閾値", helper:"この値を超えると減点" },
 { key:"perPenaltyWeight", label:"PER 減点幅", helper:"減点幅" },
 { key:"dilutionPenalty", label:"希薄化リスク減点", helper:"希薄化リスク時の減点" },
 { key:"oneOffProfitPenalty", label:"一過性利益依存の減点", helper:"一過性利益依存時の減点" }
];

export function ScoreTuningPanel({ config, onChange, onReset }: ScoreTuningPanelProps): JSX.Element {
 return (
 <section className="rounded-lg border border-border-subtle bg-panel p-5 shadow-card">
 <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
 <div>
 <h2 className="text-lg font-semibold text-text-primary">本命度チューニング</h2>
 <p className="text-xs text-text-muted">閾値と重みを調整すると score / action を即時再計算します。</p>
 </div>
 <button
 type="button"
 onClick={onReset}
 className="rounded-lg border border-border-subtle px-3 py-2 text-xs font-semibold text-text-primary"
 >
 初期値に戻す
 </button>
 </div>

 <div className="grid gap-2 md:grid-cols-3">
 {FIELDS.map((field) => {
 const value = config[field.key];
 const defaultValue = DEFAULT_SCORING_CONFIG[field.key];
 const changed = value !== defaultValue;
 return (
 <label
 key={field.key}
 className="rounded-lg border border-border-subtle bg-canvas-deep/60 p-3 text-xs text-text-primary"
 >
 <p className="font-semibold text-text-primary">{field.label}</p>
 <p className="mt-1 text-text-muted">{field.helper}</p>
 <input
 type="number"
 step="0.1"
 value={value}
 onChange={(event) =>
 onChange({
 [field.key]: Number(event.target.value)
 } as Partial<ScoringConfig>)
 }
 className="mt-2 w-full rounded-lg border border-border-subtle bg-canvas/90 px-2 py-2 text-xs font-mono tabular-nums text-text-primary outline-none"
 />
 <p className="mt-1 text-text-muted font-mono tabular-nums">
 初期値: {defaultValue}
 {changed ?" (変更中)" :""}
 </p>
 </label>
 );
 })}
 </div>
 </section>
 );
}
