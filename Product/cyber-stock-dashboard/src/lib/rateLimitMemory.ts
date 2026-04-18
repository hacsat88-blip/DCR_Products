// Simple in-memory IP rate limiter (per process). Suitable for development /
// single-instance deployments. For multi-instance use a shared store.

export interface RateLimitOptions {
  max: number;
  windowMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const STORES: Map<string, Map<string, Bucket>> = new Map();

function storeFor(key: string): Map<string, Bucket> {
  let s = STORES.get(key);
  if (!s) {
    s = new Map();
    STORES.set(key, s);
  }
  return s;
}

export function rateLimit(
  storeKey: string,
  ip: string,
  opts: RateLimitOptions,
): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const store = storeFor(storeKey);
  const b = store.get(ip);
  if (!b || b.resetAt < now) {
    store.set(ip, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true };
  }
  if (b.count >= opts.max) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true };
}

export function resetRateLimit(storeKey?: string): void {
  if (storeKey) STORES.get(storeKey)?.clear();
  else STORES.clear();
}

export function clientIpFromRequest(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "anon";
}
