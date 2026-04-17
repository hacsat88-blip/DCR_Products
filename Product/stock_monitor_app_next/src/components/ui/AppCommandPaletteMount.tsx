"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import type { CommandAction } from "@/lib/commandPalette/actionRegistry";

import { CommandPalette } from "./CommandPalette";
import { buildSnapshotActions } from "./SnapshotIoButtons";

/** Subset of Next.js AppRouter we actually use — easier to mock in tests. */
export interface PaletteRouter {
  push: (href: string) => void;
}

function resetLayout(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("inp-dashboard-layout-v1");
  } catch (error) {
    console.error("[AppCommandPaletteMount] resetLayout failed", error);
  }
  window.location.reload();
}

/**
 * Dispatch a CustomEvent on `window` after a short delay so the destination
 * page has time to mount and attach its listener following a client-side
 * router.push().
 */
function dispatchAfterNav(eventName: string, delayMs = 250): void {
  if (typeof window === "undefined") return;
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent(eventName));
  }, delayMs);
}

/**
 * Build the default action registry for the global command palette.
 * Exported for unit tests so the registry can be inspected without
 * rendering the palette UI.
 */
export function buildDefaultActions(router: PaletteRouter): CommandAction[] {
  const go = (href: string): (() => void) => () => router.push(href);
  const goAndEmit =
    (href: string, eventName: string): (() => void) =>
    () => {
      router.push(href);
      dispatchAfterNav(eventName);
    };

  return [
    ...buildSnapshotActions(),
    {
      id: "nav.dashboard",
      label: "ダッシュボードを開く",
      hint: "/",
      section: "ナビゲーション",
      keywords: ["dashboard", "home", "top", "ダッシュボード"],
      onSelect: go("/"),
    },
    {
      id: "nav.etf",
      label: "ETF を開く",
      hint: "/etf",
      section: "ナビゲーション",
      keywords: ["etf", "fund"],
      onSelect: go("/etf"),
    },
    {
      id: "nav.portfolio",
      label: "ポートフォリオを開く",
      hint: "/portfolio",
      section: "ナビゲーション",
      keywords: ["portfolio", "holdings", "ポートフォリオ"],
      onSelect: go("/portfolio"),
    },
    {
      id: "nav.backtest",
      label: "バックテストを開く",
      hint: "/backtest",
      section: "ナビゲーション",
      keywords: ["backtest", "simulation", "バックテスト"],
      onSelect: go("/backtest"),
    },
    {
      id: "nav.alerts",
      label: "アラートを開く",
      hint: "/alerts",
      section: "ナビゲーション",
      keywords: ["alerts", "notification", "アラート", "通知"],
      onSelect: go("/alerts"),
    },
    {
      id: "portfolio.addHolding",
      label: "ポートフォリオに銘柄を追加",
      hint: "/portfolio",
      section: "ポートフォリオ",
      keywords: ["portfolio", "add", "holding", "銘柄追加", "ポートフォリオ"],
      onSelect: goAndEmit("/portfolio", "portfolio:open-add"),
    },
    {
      id: "backtest.runSample",
      label: "サンプルデータでバックテスト実行",
      hint: "/backtest",
      section: "バックテスト",
      keywords: ["backtest", "run", "sample", "バックテスト", "実行"],
      onSelect: goAndEmit("/backtest", "backtest:run-sample"),
    },
    {
      id: "alerts.evaluateNow",
      label: "アラートを今すぐ評価",
      hint: "/alerts",
      section: "アラート",
      keywords: ["alerts", "evaluate", "アラート", "評価"],
      onSelect: goAndEmit("/alerts", "alerts:evaluate-now"),
    },
    {
      id: "theme.reset",
      label: "ダッシュボードのレイアウトをリセット",
      hint: "再読み込み",
      section: "表示",
      keywords: ["reset", "layout", "theme", "リセット", "レイアウト"],
      onSelect: resetLayout,
    },
  ];
}

/**
 * Mounted once at the app root ({@link RootLayout}). Registers the
 * default set of command palette actions.
 */
export function AppCommandPaletteMount(): JSX.Element {
  const router = useRouter();
  const actions = useMemo(() => buildDefaultActions(router), [router]);
  return <CommandPalette actions={actions} />;
}

export default AppCommandPaletteMount;
