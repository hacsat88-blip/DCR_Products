import { Dispatch, SetStateAction, useEffect, useState } from "react";

export interface StatusData {
  daily_pnl: number;
  trade_count: number;
  consecutive_losses: number;
  positions: number;
  trading_stopped: boolean;
  stop_reason: string;
  new_entries_blocked: boolean;
  new_entries_block_reason: string;
  risk_budget: number;
  simulation_mode: boolean;
  tier?: string;
  session_date?: string | null;
}

export function useStatusPolling(
  intervalMs = 5000,
): [StatusData | null, Dispatch<SetStateAction<StatusData | null>>] {
  const [status, setStatus] = useState<StatusData | null>(null);

  useEffect(() => {
    const fetchStatus = () =>
      fetch("/api/status")
        .then((r) => r.json())
        .then(setStatus)
        .catch(() => {});
    fetchStatus();
    const id = setInterval(fetchStatus, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return [status, setStatus];
}
