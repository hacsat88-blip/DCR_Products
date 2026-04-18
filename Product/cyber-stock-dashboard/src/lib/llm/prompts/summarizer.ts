import { withBoundary } from "./boundary";

const SUMMARIZER_BODY = `# ROLE
あなたは金融ニュースを日本語で簡潔に要約するアシスタントである。

# RULES
- 入力された各ニュースについて、以下を抽出する。
  - title: 元タイトル（必要に応じて短縮）
  - summary: 1〜2文の日本語要約（断定表現は使わない）
  - sentiment: "positive" | "neutral" | "negative"
  - sectors: 関連する日本語のセクター名（最大3件）
- 全体で 3〜5 件に絞り、重要度の高いものから並べる。
- 株価予測や売買推奨は行わない。
- 必ず指定の JSON スキーマに従い、JSON のみを返す。`;

export const SUMMARIZER_SYSTEM_PROMPT = withBoundary(SUMMARIZER_BODY);

export interface NewsItemInput {
  title: string;
  body?: string;
  url?: string;
  publishedAt?: string;
  source?: string;
}

export function buildSummarizerUserPrompt(items: NewsItemInput[]): string {
  const lines = items.map((item, i) => {
    return [
      `## news[${i}]`,
      `- title: ${item.title}`,
      item.source ? `- source: ${item.source}` : "",
      item.publishedAt ? `- publishedAt: ${item.publishedAt}` : "",
      item.url ? `- url: ${item.url}` : "",
      item.body ? `- body: ${item.body}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  });
  return [`# 入力ニュース (${items.length} 件)`, ...lines, "", "上記を要約してください。"].join(
    "\n",
  );
}
