import { useCallback, useEffect, useRef, useState } from "react";

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
  tier?: string;
  lot?: number;
}

export function useWebSocket(url: string) {
  const [lastMessage, setLastMessage] = useState<BroadcastEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destroyedRef = useRef(false);

  useEffect(() => {
    destroyedRef.current = false;

    function connect() {
      if (destroyedRef.current) return;
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        try {
          setLastMessage(JSON.parse(e.data));
        } catch {
          /* ignore */
        }
      };
      ws.onerror = (e) => {
        console.warn("[WebSocket] connection error", e);
      };
      ws.onclose = () => {
        if (!destroyedRef.current) {
          retryRef.current = setTimeout(connect, 3000);
        }
      };
    }

    connect();

    return () => {
      destroyedRef.current = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [url]);

  const send = useCallback((data: unknown) => {
    wsRef.current?.send(JSON.stringify(data));
  }, []);

  return { lastMessage, send };
}
