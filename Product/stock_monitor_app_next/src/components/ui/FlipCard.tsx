"use client";

import { motion } from "framer-motion";
import { createElement as h, useCallback, useEffect, useState } from "react";
import clsx from "clsx";

export interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  flipped?: boolean;
  defaultFlipped?: boolean;
  onFlip?: (flipped: boolean) => void;
  className?: string;
  ariaLabelFront?: string;
  ariaLabelBack?: string;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = (): void => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

function FlipIcon(): JSX.Element {
  return h(
    "svg",
    {
      width: 14,
      height: 14,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true,
    },
    h("path", { d: "M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.7-3" }),
    h("path", { d: "M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.7 3" }),
    h("polyline", { points: "21 3 21 9 15 9" }),
    h("polyline", { points: "3 21 3 15 9 15" }),
  );
}

export function FlipCard({
  front,
  back,
  flipped,
  defaultFlipped = false,
  onFlip,
  className,
  ariaLabelFront = "表面",
  ariaLabelBack = "裏面",
}: FlipCardProps): JSX.Element {
  const isControlled = typeof flipped === "boolean";
  const [internal, setInternal] = useState(defaultFlipped);
  const current = isControlled ? (flipped as boolean) : internal;
  const reducedMotion = usePrefersReducedMotion();

  const toggle = useCallback(() => {
    const next = !current;
    if (!isControlled) setInternal(next);
    onFlip?.(next);
  }, [current, isControlled, onFlip]);

  const handleSurfaceClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, a, input, select, textarea, [role='button']")) {
        return;
      }
      toggle();
    },
    [toggle],
  );

  const duration = reducedMotion ? 0 : 0.62;

  return h(
    "div",
    {
      className: clsx("inp-flip-card relative", className),
      style: { perspective: 1200 },
      onClick: handleSurfaceClick,
    },
    h(
      motion.div,
      {
        className: "relative w-full h-full",
        style: { transformStyle: "preserve-3d" },
        animate: { rotateY: current ? 180 : 0 },
        transition: { duration, ease: [0.2, 0.8, 0.2, 1] },
      },
      h(
        "div",
        {
          className: "absolute inset-0 w-full h-full",
          style: { backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" },
          "aria-label": ariaLabelFront,
          "aria-hidden": current,
        },
        front,
      ),
      h(
        "div",
        {
          className: "absolute inset-0 w-full h-full",
          style: {
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          },
          "aria-label": ariaLabelBack,
          "aria-hidden": !current,
        },
        back,
      ),
    ),
    h(
      "button",
      {
        type: "button",
        onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          toggle();
        },
        "aria-pressed": current,
        "aria-label": current ? ariaLabelFront : ariaLabelBack,
        className: clsx(
          "absolute top-2 right-2 z-10 inline-flex items-center justify-center",
          "w-7 h-7 rounded-full text-[color:var(--inp-text-primary)]",
          "bg-[color:var(--inp-bg-elevated)] inp-neon-ring",
          "transition-transform hover:scale-105 focus:outline-none",
          "focus-visible:ring-2 focus-visible:ring-[color:var(--inp-accent)]",
        ),
      },
      h(FlipIcon, null),
    ),
  );
}

export default FlipCard;
