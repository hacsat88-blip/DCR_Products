export const DEFAULT_SERVER_BASE_URL =
  process.env.NEXT_PUBLIC_AUTOTRADER_SERVER_BASE_URL ?? "http://127.0.0.1:8000";

export const SOCKET_STALE_MS = 15_000;
export const SOCKET_RECONNECT_MS = 5_000;
export const MAX_EVENT_HISTORY = 50;