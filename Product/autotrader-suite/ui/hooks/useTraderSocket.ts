import { useEffect, useRef, useState } from "react";

import {
  DEFAULT_SERVER_BASE_URL,
  SOCKET_RECONNECT_MS,
  SOCKET_STALE_MS
} from "@/lib/constants";
import {
  createInitialTraderState,
  isRawTraderPayload,
  reduceTraderState
} from "@/lib/trader-view-model";
import type { TraderViewModel } from "@/types/trader";

function buildSocketUrl(baseUrl: string): string {
  const url = new URL("/ws", baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export function useTraderSocket(): TraderViewModel {
  const [state, setState] = useState<TraderViewModel>(() => createInitialTraderState());
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let disposed = false;

    const clearReconnectTimer = (): void => {
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const clearStaleTimer = (): void => {
      if (staleTimerRef.current !== null) {
        clearTimeout(staleTimerRef.current);
        staleTimerRef.current = null;
      }
    };

    const scheduleStale = (): void => {
      clearStaleTimer();
      staleTimerRef.current = setTimeout(() => {
        if (disposed) {
          return;
        }

        setState((current) => ({
          ...current,
          connectionState: "stale"
        }));
      }, SOCKET_STALE_MS);
    };

    const connect = (): void => {
      if (disposed) {
        return;
      }

      clearReconnectTimer();
      const socket = new WebSocket(buildSocketUrl(DEFAULT_SERVER_BASE_URL));
      socketRef.current = socket;

      const queueReconnect = (): void => {
        if (disposed) {
          return;
        }

        clearStaleTimer();
        setState((current) => ({
          ...current,
          connectionState: "reconnecting"
        }));

        if (reconnectTimerRef.current !== null) {
          return;
        }

        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null;
          connect();
        }, SOCKET_RECONNECT_MS);
      };

      socket.onmessage = (event) => {
        if (disposed) {
          return;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(event.data);
        } catch {
          return;
        }

        if (!isRawTraderPayload(parsed)) {
          return;
        }

        setState((current) => reduceTraderState(current, parsed));
        scheduleStale();
      };

      socket.onclose = () => {
        queueReconnect();
      };

      socket.onerror = () => {
        queueReconnect();
      };
    };

    connect();

    return () => {
      disposed = true;
      clearReconnectTimer();
      clearStaleTimer();
      const activeSocket = socketRef.current;
      socketRef.current = null;
      activeSocket?.close();
    };
  }, []);

  return state;
}