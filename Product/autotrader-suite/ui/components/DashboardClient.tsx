"use client";

import { DashboardShell } from "@/components/DashboardShell";
import { useTraderHealth } from "@/hooks/useTraderHealth";
import { useTraderSocket } from "@/hooks/useTraderSocket";

export function DashboardClient(): JSX.Element {
  const state = useTraderSocket();
  const health = useTraderHealth();

  return <DashboardShell state={state} health={health} />;
}