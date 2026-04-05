import clsx from "clsx";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circle" | "rect";
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, variant = "text", width, height }: SkeletonProps): JSX.Element {
  return (
    <div
      className={clsx(
        "animate-shimmer bg-gradient-to-r from-canvas-deep via-mint/5 to-canvas-deep bg-[length:200%_100%]",
        variant === "text" && "h-4 rounded",
        variant === "circle" && "rounded-full",
        variant === "rect" && "rounded-none",
        className
      )}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard(): JSX.Element {
  return (
    <div className="rounded-none border border-glass-border bg-panel p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2">
          <Skeleton width={60} />
          <Skeleton width={120} height={24} />
        </div>
        <Skeleton variant="circle" width={44} height={44} />
      </div>
      <Skeleton className="mt-3" width={100} height={28} />
      <Skeleton className="mt-2" width={80} />
      <Skeleton className="mt-3" height={16} />
      <Skeleton className="mt-1" width="80%" height={16} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Skeleton variant="rect" height={48} />
        <Skeleton variant="rect" height={48} />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }): JSX.Element {
  return (
    <div className="space-y-2">
      <Skeleton variant="rect" height={40} className="rounded-none opacity-60" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="rect" height={48} className={i % 2 === 0 ? "rounded-none opacity-40" : "rounded-none opacity-30"} />
      ))}
    </div>
  );
}
