import * as React from "react";
import { cn } from "@/lib/cn";

export type NeonCardGlow = "subtle" | "strong" | "alert";

type NeonCardOwnProps<T extends React.ElementType> = {
  as?: T;
  glow?: NeonCardGlow;
  interactive?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export type NeonCardProps<T extends React.ElementType = "div"> =
  NeonCardOwnProps<T> &
    Omit<React.ComponentPropsWithoutRef<T>, keyof NeonCardOwnProps<T>>;

const glowMap: Record<NeonCardGlow, string> = {
  subtle:
    "border-neon/30 shadow-[0_0_18px_rgba(0,225,255,0.18),inset_0_0_12px_rgba(0,225,255,0.08)] hover:shadow-[0_0_32px_rgba(0,225,255,0.45),inset_0_0_16px_rgba(0,225,255,0.18)]",
  strong:
    "border-neon/70 shadow-[0_0_24px_rgba(0,225,255,0.45),inset_0_0_16px_rgba(0,225,255,0.18)] hover:shadow-[0_0_44px_rgba(0,225,255,0.7),inset_0_0_22px_rgba(0,225,255,0.28)]",
  alert:
    "border-alert/70 shadow-[0_0_24px_rgba(255,59,107,0.45),inset_0_0_16px_rgba(255,59,107,0.18)] hover:shadow-[0_0_40px_rgba(255,59,107,0.7),inset_0_0_22px_rgba(255,59,107,0.28)]",
};

export function NeonCard<T extends React.ElementType = "div">({
  as,
  glow = "subtle",
  interactive = false,
  className,
  children,
  ...rest
}: NeonCardProps<T>) {
  const Component = (as ?? "div") as React.ElementType;
  return (
    <Component
      data-glow={glow}
      className={cn(
        "relative rounded-2xl border bg-bg/70 p-5 backdrop-blur-sm transition-shadow duration-300",
        glowMap[glow],
        interactive && "cursor-pointer",
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}
