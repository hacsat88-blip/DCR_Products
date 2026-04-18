import * as React from "react";
import { cn } from "@/lib/cn";

export type NeonButtonVariant = "primary" | "ghost" | "danger";
export type NeonButtonSize = "sm" | "md" | "lg";

export interface NeonButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: NeonButtonVariant;
  size?: NeonButtonSize;
  isLoading?: boolean;
}

const variantMap: Record<NeonButtonVariant, string> = {
  primary:
    "border-neon/70 bg-neon/10 text-neon shadow-[0_0_18px_rgba(0,225,255,0.35)] hover:bg-neon/20 hover:shadow-[0_0_28px_rgba(0,225,255,0.6)]",
  ghost:
    "border-text/30 bg-transparent text-text hover:border-neon/60 hover:text-neon hover:shadow-[0_0_18px_rgba(0,225,255,0.35)]",
  danger:
    "border-alert/70 bg-alert/10 text-alert shadow-[0_0_18px_rgba(255,59,107,0.35)] hover:bg-alert/20 hover:shadow-[0_0_28px_rgba(255,59,107,0.6)]",
};

const sizeMap: Record<NeonButtonSize, string> = {
  sm: "h-8 px-3 text-xs rounded-xl",
  md: "h-10 px-4 text-sm rounded-xl",
  lg: "h-12 px-6 text-base rounded-2xl",
};

export const NeonButton = React.forwardRef<HTMLButtonElement, NeonButtonProps>(
  function NeonButton(
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      className,
      children,
      disabled,
      type = "button",
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        data-variant={variant}
        data-size={size}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        className={cn(
          "inline-flex items-center justify-center gap-2 border font-medium tracking-wider uppercase transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/70 disabled:cursor-not-allowed disabled:opacity-50",
          variantMap[variant],
          sizeMap[size],
          className,
        )}
        {...rest}
      >
        {isLoading && (
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
        <span>{children}</span>
      </button>
    );
  },
);
