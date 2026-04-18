import { withBoundary } from "./boundary";

const INTENT_BODY = `# ROLE
ユーザーの自然文入力を、構造化された投資リサーチ条件に変換するアシスタント。

# EXTRACTION TARGETS
- market: "JP" | "US" | "BOTH"  （未指定なら "JP"）
- priceRangeMin: number | null   （株価レンジ下限。通貨は currency に従う）
- priceRangeMax: number | null   （株価レンジ上限）
- currency: "JPY" | "USD"        （未指定なら market から推定）
- theme: string | null           （テーマ・セクター・キーワード）
- style: "短期値幅狙い" | "中期テーマ" | "長期成長" | "配当重視" | "総合"
- riskTolerance: "low" | "mid" | "high"

# RULES
- 「100〜200円台」は 100〜299 と解釈する。
- 「100〜200円」は 100〜200 と解釈する。
- 入力に存在しない項目は null またはデフォルトを使う（推測しすぎない）。
- 必ず指定の JSON スキーマに従い、JSON のみを返す。`;

export const INTENT_SYSTEM_PROMPT = withBoundary(INTENT_BODY);

export function buildIntentUserPrompt(text: string): string {
  return `# ユーザー入力\n${text}\n\n上記から条件を抽出してください。`;
}
