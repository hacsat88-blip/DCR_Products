"use client";

import clsx from "clsx";
import { ReactNode, useState } from "react";

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  badge?: ReactNode;
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  className,
  badge
}: CollapsibleSectionProps): JSX.Element {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={clsx("border-b border-border-subtle", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 py-3.5 text-left transition-colors hover:text-text-primary"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span className="font-orb text-sm font-semibold uppercase tracking-wider text-text-primary">{title}</span>
          {badge}
        </span>
        <svg
          className={clsx(
            "h-4 w-4 text-text-muted transition-transform duration-300 ease-smooth",
            open && "rotate-180"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={clsx(
          "grid transition-all duration-300 ease-smooth",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className={clsx("pb-4", open && "animate-fade-in")}>{children}</div>
        </div>
      </div>
    </div>
  );
}
