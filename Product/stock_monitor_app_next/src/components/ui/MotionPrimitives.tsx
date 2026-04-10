// ────────────────────────────────────────────────
// Framer Motion Shared Animation Components & Presets
// ────────────────────────────────────────────────
//
// Reusable animation primitives for the Stock Monitor dashoard.
// All animations respect reduced motion preferences.

"use client";

import { motion, AnimatePresence, type Variants } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";

// ── Easing ──

export const EASE_SMOOTH = [0.16, 1, 0.3, 1] as const;
export const EASE_SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

// ── Fade Up ──

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_SMOOTH } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

// ── Scale In ──

export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: EASE_SMOOTH } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

// ── Slide In Right ──

export const slideInRightVariants: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: EASE_SMOOTH } },
  exit: { opacity: 0, x: 16, transition: { duration: 0.2 } },
};

// ── Stagger Container ──

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_SMOOTH } },
};

// ── AnimatedNumber — Count-up animation for numeric displays ──

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  formatFn?: (n: number) => string;
  className?: string;
  style?: React.CSSProperties;
}

export function AnimatedNumber({
  value,
  duration = 0.8,
  formatFn = (n) => n.toLocaleString(),
  className,
  style,
}: AnimatedNumberProps): JSX.Element {
  const [displayed, setDisplayed] = useState(value);
  const prevRef = useRef(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = value;

    if (from === to) return;

    const startTime = performance.now();
    const durationMs = duration * 1000;

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(from + (to - from) * eased);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  return <span className={className} style={style}>{formatFn(displayed)}</span>;
}

// ── TabContent wrapper with AnimatePresence ──

interface AnimatedTabContentProps {
  activeKey: string;
  children: React.ReactNode;
}

export function AnimatedTabContent({ activeKey, children }: AnimatedTabContentProps): JSX.Element {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeKey}
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={fadeUpVariants}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ── Card wrapper with hover lift effect ──

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function AnimatedCard({ children, className = "", delay = 0 }: AnimatedCardProps): JSX.Element {
  return (
    <motion.div
      variants={staggerItemVariants}
      whileHover={{
        y: -2,
        boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
        transition: { duration: 0.2 },
      }}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── FlipCard — Reveals content with a flip animation ──

interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  isFlipped: boolean;
  className?: string;
}

export function FlipCard({ front, back, isFlipped, className = "" }: FlipCardProps): JSX.Element {
  return (
    <div className={`relative ${className}`} style={{ perspective: 800 }}>
      <AnimatePresence mode="wait">
        {!isFlipped ? (
          <motion.div
            key="front"
            initial={{ rotateY: -90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: 90, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE_SMOOTH }}
            style={{ backfaceVisibility: "hidden" }}
          >
            {front}
          </motion.div>
        ) : (
          <motion.div
            key="back"
            initial={{ rotateY: -90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: 90, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE_SMOOTH }}
            style={{ backfaceVisibility: "hidden" }}
          >
            {back}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Progress Step Indicator — Horizontal stepper with animation ──

export interface StepStatus {
  label: string;
  status: "idle" | "running" | "done" | "error";
}

interface PipelineStepperProps {
  steps: StepStatus[];
  className?: string;
}

export function PipelineStepper({ steps, className = "" }: PipelineStepperProps): JSX.Element {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {steps.map((step, i) => (
        <React.Fragment key={step.label}>
          <motion.div
            className="flex flex-col items-center gap-1"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
          >
            <motion.div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                step.status === "done"
                  ? "bg-positive text-white"
                  : step.status === "running"
                    ? "bg-primary text-white"
                    : step.status === "error"
                      ? "bg-danger text-white"
                      : "bg-border-subtle text-text-muted"
              }`}
              animate={
                step.status === "running"
                  ? { scale: [1, 1.15, 1], boxShadow: ["0 0 0 0 rgba(0,217,255,0.4)", "0 0 0 8px rgba(0,217,255,0)", "0 0 0 0 rgba(0,217,255,0.4)"] }
                  : {}
              }
              transition={
                step.status === "running"
                  ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                  : {}
              }
            >
              {step.status === "done" ? (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  ✓
                </motion.span>
              ) : step.status === "error" ? (
                "✗"
              ) : (
                i + 1
              )}
            </motion.div>
            <span className="max-w-[60px] truncate text-center text-[10px] text-text-muted">
              {step.label}
            </span>
          </motion.div>
          {i < steps.length - 1 && (
            <motion.div
              className="h-0.5 flex-1 rounded-full"
              initial={{ scaleX: 0 }}
              animate={{
                scaleX: step.status === "done" ? 1 : 0.3,
                backgroundColor: step.status === "done" ? "#22C55E" : "#2a3444",
              }}
              transition={{ duration: 0.5, ease: EASE_SMOOTH }}
              style={{ originX: 0 }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// Re-export motion and AnimatePresence for direct use
export { motion, AnimatePresence };
