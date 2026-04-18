"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

interface Tab {
  href: string;
  label: string;
}

const BASE_TABS: Tab[] = [
  { href: "/", label: "Dashboard" },
  { href: "/analyze", label: "Analyze" },
  { href: "/portfolio", label: "Portfolio" },
];

function normalize(pathname: string): string {
  if (pathname === "/") return pathname;
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export interface GlobalTabsProps {
  className?: string;
}

export function GlobalTabs({ className }: GlobalTabsProps) {
  const pathname = normalize(usePathname() ?? "/");
  const isStockPath = pathname.startsWith("/stocks/");
  const tabs = isStockPath
    ? [...BASE_TABS, { href: pathname, label: "Stock" }]
    : BASE_TABS;

  return (
    <nav className={cn("flex gap-1 text-xs", className)} aria-label="Primary">
      {tabs.map((tab) => {
        const active = isActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg border border-text/15 px-3 py-1.5 transition-colors",
              active
                ? "border-neon/70 bg-neon/10 text-neon"
                : "text-text/70 hover:border-neon/60 hover:text-neon",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
