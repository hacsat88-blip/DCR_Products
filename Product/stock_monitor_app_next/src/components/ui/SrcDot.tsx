import clsx from "clsx";

import { getSourceLabelMeta, resolveSourceLabel, type SourceLabel } from "@/types/source";

type SrcScope = "price" | "fundamentals" | "overall";

const SOURCE_SCOPE_SHORT: Record<SrcScope, string> = {
  price: "P",
  fundamentals: "F",
  overall: "O"
};

const SOURCE_SCOPE_TEXT: Record<SrcScope, string> = {
  price: "価格",
  fundamentals: "財務",
  overall: "総合"
};

const SOURCE_DOT_TONE: Record<SourceLabel, string> = {
  YF: "bg-secondary",
  AV: "bg-primary",
  C: "bg-amber",
  M: "bg-text-muted"
};

export interface SrcDotProps {
  label?: SourceLabel | null;
  scope: SrcScope;
  className?: string;
}

export function SrcDot({ label, scope, className }: SrcDotProps): JSX.Element {
  const meta = getSourceLabelMeta(label, "M");
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border border-border-subtle/70 bg-canvas-deep/50 px-1.5 py-0.5 text-[10px] leading-none text-text-muted",
        className
      )}
      title={`${SOURCE_SCOPE_TEXT[scope]}取得元: ${meta.name} (${meta.label})`}
      aria-label={`${SOURCE_SCOPE_TEXT[scope]}取得元 ${meta.name}`}
    >
      <span className="font-mono tabular-nums text-[9px] uppercase tracking-wide text-text-muted/80">
        {SOURCE_SCOPE_SHORT[scope]}
      </span>
      <span className={clsx("h-1.5 w-1.5 rounded-full", SOURCE_DOT_TONE[meta.label])} />
      <span className="font-mono tabular-nums text-[10px] text-text-secondary">{meta.label}</span>
    </span>
  );
}

interface SrcMetaDotsProps {
  priceLabel?: SourceLabel | null;
  fundamentalsLabel?: SourceLabel | null;
  showOverall?: boolean;
  className?: string;
}

export function SrcMetaDots({
  priceLabel,
  fundamentalsLabel,
  showOverall = false,
  className
}: SrcMetaDotsProps): JSX.Element {
  const overallLabel = resolveSourceLabel([priceLabel ?? null, fundamentalsLabel ?? null]);
  return (
    <div className={clsx("flex flex-wrap items-center gap-1", className)}>
      <SrcDot label={priceLabel} scope="price" />
      <SrcDot label={fundamentalsLabel} scope="fundamentals" />
      {showOverall ? <SrcDot label={overallLabel} scope="overall" /> : null}
    </div>
  );
}
