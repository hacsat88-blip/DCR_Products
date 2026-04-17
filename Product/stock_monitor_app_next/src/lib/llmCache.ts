// ────────────────────────────────────────────────
// LLM Response Cache — input-hash keyed, TTL based
// ────────────────────────────────────────────────
//
// In-memory cache for expensive deep-LLM responses. Scoped per
// Node.js process; Vercel Hobby warm instances share it within
// an invocation window, which is good enough for cost control.

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export async function hashKey(input: unknown): Promise<string> {
  const json = typeof input === "string" ? input : JSON.stringify(input);
  // Prefer Web Crypto (Edge / modern Node). Fall back to a cheap 32-bit hash.
  const cryptoGlobal = (globalThis as { crypto?: Crypto }).crypto;
  if (cryptoGlobal?.subtle) {
    const buf = new TextEncoder().encode(json);
    const digest = await cryptoGlobal.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let h = 2166136261 >>> 0;
  for (let i = 0; i < json.length; i += 1) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export function getCached<T>(key: string): T | null {
  const entry = store.get(key) as Entry<T> | undefined;
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function setCached<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function purgeExpired(): number {
  const now = Date.now();
  let n = 0;
  for (const [k, v] of store.entries()) {
    if (v.expiresAt < now) {
      store.delete(k);
      n += 1;
    }
  }
  return n;
}

export function __resetLlmCache(): void {
  store.clear();
}
