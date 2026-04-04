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
        "animate-shimmer bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-[length:200%_100%]",
        variant === "text" && "h-4 rounded",
        variant === "circle" && "rounded-full",
        variant === "rect" && "rounded-xl",
        className
      )}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard(): JSX.Element {
  return (
    <div className="rounded-2xl border border-glass-border bg-panel p-4 shadow-card">
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
      <Skeleton variant="rect" height={40} className="opacity-60" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="rect" height={48} className={i % 2 === 0 ? "opacity-40" : "opacity-30"} />
      ))}
    </div>
  );
}
