export type Sentiment = "positive" | "negative" | "neutral";

const POSITIVE_PATTERNS: RegExp[] = [
  /上方修正/,
  /増配/,
  /最高益/,
  /過去最高/,
  /黒字転換/,
  /beats?\b/i,
  /\bupgrade[ds]?\b/i,
  /\brecord(?:\s+high)?\b/i,
  /\boutperform\b/i,
];

const NEGATIVE_PATTERNS: RegExp[] = [
  /下方修正/,
  /減配/,
  /減益/,
  /赤字/,
  /業績悪化/,
  /\bmiss(?:es|ed)?\b/i,
  /\bdowngrade[ds]?\b/i,
  /\blawsuit\b/i,
  /\bunderperform\b/i,
];

export function classifySentiment(title: string, summary?: string): Sentiment {
  const text = `${title} ${summary ?? ""}`;
  let pos = 0;
  let neg = 0;
  for (const r of POSITIVE_PATTERNS) if (r.test(text)) pos++;
  for (const r of NEGATIVE_PATTERNS) if (r.test(text)) neg++;
  if (pos === neg) return "neutral";
  return pos > neg ? "positive" : "negative";
}
