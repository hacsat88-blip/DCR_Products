import { withBoundary } from "./boundary";

/**
 * 5軸スコア + 短中長期シナリオ + リスク + カタリスト + Unknown を
 * JSON で返させるためのアナライザー system prompt。
 * v4.1 プロンプトのスコアリング/シナリオ章を要約。
 */
const ANALYZER_BODY = `# ROLE
あなたは株価レンジ・市場条件をもとに、短期・中期・長期の値動きシナリオを整理する投資リサーチ支援AIである。
売買判断の代行ではなく、ユーザーが判断材料を整理できるように見える化することが目的である。

# SCORING（5軸 / 各 0-100）
- A. 値動き余地     (重み 25%): 直近レンジ、上値抵抗、下値支持、ボラティリティ
- B. 出来高・需給   (重み 20%): 出来高増減、売買代金、流動性、信用需給
- C. 材料・テーマ   (重み 20%): 決算、IR、業績修正、政策・セクターテーマ
- D. ファンダメンタル(重み 20%): 成長性、利益、財務、割安性
- E. リスク耐性     (重み 15%): 財務悪化、希薄化、流動性、急落リスク

totalScore = 0.25A + 0.20B + 0.20C + 0.20D + 0.15E （0-100）

# SCENARIOS
短期(数日〜3か月) / 中期(3〜12か月) / 長期(1〜3年) について、
それぞれ up / mid / down の3シナリオを必ず出す。
- up, mid, down: 推定リターンの説明（例: "+10%〜+20%（推定）"）
- confidence: "high" | "mid" | "low"
- evidence: "A"（複数Fact一致） | "B"（一部データ） | "C"（データ不足の仮説）

# RISKS / CATALYSTS / UNKNOWNS
- risks: 主要な下振れリスクを箇条書き
- catalysts: 上振れトリガー
- unknowns: データ未確認・確認できなかった項目

# OUTPUT
必ず指定の JSON スキーマに従い、JSON のみを出力する。文章説明や markdown は禁止。
すべての値動き表現には「推定」または「仮説」を含めること。`;

export const ANALYZER_SYSTEM_PROMPT = withBoundary(ANALYZER_BODY);

export interface AnalyzerInput {
  code: string;
  name?: string;
  market?: "JP" | "US" | "BOTH";
  priceContext?: string;
  fundamentals?: string;
  news?: string;
  style?: string;
  riskTolerance?: "low" | "mid" | "high";
}

export function buildAnalyzerUserPrompt(input: AnalyzerInput): string {
  return [
    `# 対象銘柄`,
    `- code: ${input.code}`,
    input.name ? `- name: ${input.name}` : "",
    `- market: ${input.market ?? "JP"}`,
    `- style: ${input.style ?? "総合"}`,
    `- riskTolerance: ${input.riskTolerance ?? "mid"}`,
    "",
    `# 価格・需給コンテキスト`,
    input.priceContext ?? "Unknown",
    "",
    `# ファンダメンタル`,
    input.fundamentals ?? "Unknown",
    "",
    `# 直近ニュース・材料`,
    input.news ?? "Unknown",
    "",
    `上記をもとに、5軸スコアと短期/中期/長期シナリオを JSON で返してください。`,
  ]
    .filter(Boolean)
    .join("\n");
}
