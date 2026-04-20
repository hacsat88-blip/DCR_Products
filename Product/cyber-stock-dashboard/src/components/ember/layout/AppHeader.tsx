"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo, Tabs, ThemeToggle, type TabItem } from "@/components/ember/ui";

const TABS: (TabItem & { href: string })[] = [
  { id: "home", label: "Home", jp: "ホーム", href: "/" },
  { id: "portfolio", label: "Portfolio", jp: "資産", href: "/portfolio" },
  { id: "stocks", label: "Stocks", jp: "個別銘柄", href: "/stocks" },
  { id: "analyze", label: "Analyze", jp: "分析", href: "/analyze" },
];

function tabIdFromPath(pathname: string): string {
  if (pathname.startsWith("/portfolio")) return "portfolio";
  if (pathname.startsWith("/stocks")) return "stocks";
  if (pathname.startsWith("/analyze")) return "analyze";
  return "home";
}

export function AppHeader() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const current = tabIdFromPath(pathname);

  const handleChange = (id: string) => {
    const next = TABS.find((t) => t.id === id);
    if (next) router.push(next.href);
  };

  return (
    <header
      className="sticky top-0 z-40 border-b border-border"
      style={{
        background: "color-mix(in srgb, var(--bg) 86%, transparent)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Ember Stock Atelier home" className="shrink-0">
          <Logo />
        </Link>
        <div className="hidden md:block">
          <Tabs tabs={TABS} current={current} onChange={handleChange} />
        </div>
        <ThemeToggle />
      </div>
      <div className="md:hidden border-t border-border px-4 py-2 overflow-x-auto" style={{ position: "relative" }}>
        <Tabs tabs={TABS} current={current} onChange={handleChange} />
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 32,
            background: "linear-gradient(to left, var(--bg), transparent)",
            pointerEvents: "none",
          }}
        />
      </div>
    </header>
  );
}
