"use client";

import * as React from "react";

export type IconName =
  | "chart"
  | "briefcase"
  | "target"
  | "search"
  | "spinner"
  | "alert"
  | "check"
  | "arrow-right";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  label?: string;
}

const PATHS: Record<IconName, React.ReactNode> = {
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 14l3-4 4 3 5-7" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  spinner: (
    <>
      <path d="M12 3a9 9 0 1 0 9 9" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3 2 21h20L12 3z" />
      <path d="M12 10v5" />
      <circle cx="12" cy="18" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  check: <path d="M5 12l4 4 10-10" />,
  "arrow-right": (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
};

export function Icon({ name, size = 16, label, className, ...rest }: IconProps) {
  const a11y = label
    ? { role: "img" as const, "aria-label": label }
    : { "aria-hidden": true as const };
  const isSpinner = name === "spinner";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={[isSpinner ? "ember-spin" : "", className ?? ""].filter(Boolean).join(" ")}
      {...a11y}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
