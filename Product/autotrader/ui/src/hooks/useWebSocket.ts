import { useEffect, useRef, useState, useCallback } from "react";

export interface BroadcastEvent {
  action?: string;
  reason?: string;
  trading_stopped?: boolean;
  stop_reason?: string;
  daily_pnl?: number;
  risk_budget?: number;
  symbol?: string;
  price?: number;
  confidence?: number;
  timestamp?: string;
}

export function useWebSocket(url: string) {
  const [lastMessage, setLastMessage] = useState<BroadcastEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        setLastMessage(JSON.parse(e.data));
      } catch {
        /* ignore */
      }
    };
    return () => ws.close();
  }, [url]);

  const send = useCallback((data: unknown) => {
    wsRef.current?.send(JSON.stringify(data));
  }, []);

  return { lastMessage, send };
}
