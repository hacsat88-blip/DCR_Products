import React from "react";

/** Props for the Ember card surface wrapper. */
export interface CardProps {
  children: React.ReactNode;
  /** Additional CSS class names merged onto the root element. */
  className?: string;
  /** Use the frosted-glass soft surface instead of the solid surface. Default false. */
  soft?: boolean;
  /** Apply default p-6 (1.5 rem) inner padding. Default true. */
  padded?: boolean;
}

export function Card({ children, className, soft = false, padded = true }: CardProps) {
  const solidStyle: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--r-lg)",
    boxShadow: "var(--shadow-md)",
  };

  const softStyle: React.CSSProperties = {
    background: "var(--surface-soft)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid var(--border)",
    borderRadius: "var(--r-lg)",
  };

  const classes = [
    soft ? "ember-card-soft" : "ember-card",
    padded ? "p-6" : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} style={soft ? softStyle : solidStyle}>
      {children}
    </div>
  );
}
