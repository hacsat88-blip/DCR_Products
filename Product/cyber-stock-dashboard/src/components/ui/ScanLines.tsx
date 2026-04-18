import * as React from "react";
import { cn } from "@/lib/cn";

export interface ScanLinesProps extends React.HTMLAttributes<HTMLDivElement> {
  intensity?: "soft" | "strong";
}

export function ScanLines({
  intensity = "soft",
  className,
  style,
  ...rest
}: ScanLinesProps) {
  const opacity = intensity === "strong" ? 0.12 : 0.06;
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] mix-blend-screen",
        className,
      )}
      style={{
        backgroundImage: `repeating-linear-gradient(to bottom, rgba(0,225,255,${opacity}) 0px, rgba(0,225,255,${opacity}) 1px, transparent 1px, transparent 3px)`,
        ...style,
      }}
      {...rest}
    />
  );
}
