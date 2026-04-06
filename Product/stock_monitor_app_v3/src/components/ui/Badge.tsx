import clsx from "clsx";

type BadgeTone = "buy" | "wait" | "exclude" | "info" | "warning" | "neutral";

interface BadgeProps {
  tone: BadgeTone;
  children: React.ReactNode;
  size?: "sm" | "md";
  glow?: boolean;
  accent?: boolean;
}

const toneStyles: Record<BadgeTone, string> = {
  buy: "border-positive/25 bg-positive/8 text-positive",
  wait: "border-blue/25 bg-blue/8 text-blue",
  exclude: "border-danger/25 bg-danger/8 text-danger",
  info: "border-blue/25 bg-blue/8 text-blue",
  warning: "border-amber/25 bg-amber/8 text-amber",
  neutral: "border-border-subtle bg-canvas-raised/60 text-text-secondary"
};

const accentStyles: Record<BadgeTone, string> = {
  buy: "border-l-2 border-l-positive/60",
  wait: "border-l-2 border-l-blue/60",
  exclude: "border-l-2 border-l-danger/60",
  info: "border-l-2 border-l-blue/60",
  warning: "border-l-2 border-l-amber/60",
  neutral: ""
};

const glowStyles: Record<BadgeTone, string> = {
  buy: "shadow-elevated",
  wait: "shadow-elevated",
  exclude: "",
  info: "shadow-elevated",
  warning: "",
  neutral: ""
};

export function Badge({ tone, children, size = "sm", glow = false, accent = false }: BadgeProps): JSX.Element {
  return (
    <span
      className={clsx(
        "inline-flex items-center border font-medium tracking-wide",
        accent ? accentStyles[tone] : "rounded-lg",
        !accent && "rounded-lg",
        toneStyles[tone],
        glow && glowStyles[tone],
        size === "sm" && "px-2.5 py-0.5 text-[11px]",
        size === "md" && "px-3.5 py-1 text-xs"
      )}
    >
      {children}
    </span>
  );
}
