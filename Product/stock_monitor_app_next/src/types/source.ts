export const SOURCE_LABELS = ["YF", "AV", "C", "M"] as const;

export type SourceLabel = (typeof SOURCE_LABELS)[number];

export interface SourceLabelMeta {
  label: SourceLabel;
  name: string;
}

export const SOURCE_LABEL_META: Record<SourceLabel, SourceLabelMeta> = {
  YF: { label: "YF", name: "Yahoo Finance" },
  AV: { label: "AV", name: "Alpha Vantage" },
  C: { label: "C", name: "Composite" },
  M: { label: "M", name: "Mock" }
};

export interface StockSourceMeta {
  overall: SourceLabel;
  price: SourceLabel;
  fundamentals: SourceLabel;
}

export const DEFAULT_SOURCE_META: StockSourceMeta = {
  overall: "M",
  price: "M",
  fundamentals: "M"
};

export function isSourceLabel(value: unknown): value is SourceLabel {
  return typeof value === "string" && SOURCE_LABELS.includes(value as SourceLabel);
}

export function normalizeSourceLabel(value: unknown, fallback: SourceLabel = "M"): SourceLabel {
  return isSourceLabel(value) ? value : fallback;
}

export function getSourceLabelMeta(value: unknown, fallback: SourceLabel = "M"): SourceLabelMeta {
  const label = normalizeSourceLabel(value, fallback);
  return SOURCE_LABEL_META[label];
}

export function resolveSourceLabel(labels: Array<SourceLabel | null | undefined>): SourceLabel {
  const unique = new Set(labels.filter((label): label is SourceLabel => isSourceLabel(label)));
  if (unique.size === 0) {
    return "M";
  }
  if (unique.size === 1) {
    return unique.values().next().value ?? "M";
  }
  return "C";
}
