"use client";

import { DashboardShell } from "@/components/DashboardShell";
import { useTraderSocket } from "@/hooks/useTraderSocket";

export function DashboardClient(): JSX.Element {
  const state = useTraderSocket();

  return <DashboardShell state={state} />;
}