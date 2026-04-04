"use client";

import { useMemo, useState } from "react";

const REQUIRED_FIELDS = [
  "id",
  "code",
  "name",
  "sector",
  "price",
  "changePercent",
  "marketCap",
  "oneLiner",
  "summary",
  "coreKpiLabel",
  "coreKpiValue",
  "riskSignal",
  "collapseCondition",
  "chartData"
] as const;

const SAMPLE_TEMPLATE = `{
  "id": "stock-0000",
  "code": "0000",
  "name": "サンプル銘柄",
  "sector": "業種",
  "price": 1000,
  "changePercent": 0.5,
  "marketCap": 10000000000,
  "oneLiner": "会社概要の要約",
  "summary": "企業説明の散文サマリー",
  "coreKpiLabel": "次回注目KPI",
  "coreKpiValue": "15%",
  "riskSignal": "主要リスク",
  "collapseCondition": "崩れる条件",
  "chartData": []
}`;

export function StockOnboardingPanel(): JSX.Element {
  const [draft, setDraft] = useState(SAMPLE_TEMPLATE);

  const validation = useMemo(() => {
    try {
      const parsed = JSON.parse(draft) as Record<string, unknown>;
      const missing = REQUIRED_FIELDS.filter((field) => !(field in parsed));
      const hasNarrative = typeof parsed.summary === "string" && parsed.summary.trim().length > 0;
      const hasOneLiner = typeof parsed.oneLiner === "string" && parsed.oneLiner.trim().length > 0;
      return {
        valid: missing.length === 0 && hasNarrative && hasOneLiner,
        missing,
        error: null as string | null
      };
    } catch {
      return {
        valid: false,
        missing: REQUIRED_FIELDS as readonly string[],
        error: "JSON形式が不正です"
      };
    }
  }, [draft]);

  return (
    <section className="rounded-2xl border border-slate-700/60 bg-panel p-5 shadow-card">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-slate-100">銘柄追加オンボーディング</h2>
        <p className="text-xs text-slate-400">
          mock銘柄を追加する前に、必須項目と narrative/score 要約の分離をチェックできます。
        </p>
      </div>

      <textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="h-52 w-full rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-3 font-mono text-xs text-slate-100 outline-none"
      />

      <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-xs">
        {validation.error ? <p className="text-rose-300">チェック結果: {validation.error}</p> : null}
        {!validation.error && validation.valid ? (
          <p className="text-mint">チェック結果: OK（必須項目が揃っています）</p>
        ) : null}
        {!validation.error && !validation.valid ? (
          <p className="text-amber">不足項目: {validation.missing.join(", ")}</p>
        ) : null}
        <p className="mt-2 text-slate-400">
          追加先: <code>src/data/mockStocks.ts</code> / symbol resolver: <code>providers</code> 側の定数
        </p>
      </div>
    </section>
  );
}
