// ────────────────────────────────────────────────
// Central Rate Limiter — Unified gate for external APIs
// ────────────────────────────────────────────────
//
// Tracks requests per bucket, enforces per-minute / per-day caps,
// and exposes a backoff window when a 429 is observed. Every
// outbound provider call should go through `consume()`.

export interface RateLimitRule {
  /** Bucket identifier (e.g. "gemini", "openrouter", "edinet"). */
  key: string;
  /** Max requests per rolling minute. 0 = unlimited. */
  perMinute?: number;
  /** Max requests per calendar day (UTC). 0 = unlimited. */
  perDay?: number;
}

export interface RateLimitStatus {
  key: string;
  remainingMinute: number | null;
  remainingDay: number | null;
  backoffUntil: number | null; // epoch ms; null when clear
  lastError: string | null;
}

interface BucketState {
  rule: RateLimitRule;
  minuteTimestamps: number[];
  dayCount: number;
  dayAnchor: number; // epoch ms at start of UTC day
  backoffUntil: number | null;
  lastError: string | null;
}

function startOfUtcDay(now: number): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

const buckets = new Map<string, BucketState>();

function getBucket(rule: RateLimitRule): BucketState {
  const existing = buckets.get(rule.key);
  if (existing) {
    existing.rule = rule; // keep latest caps
    return existing;
  }
  const fresh: BucketState = {
    rule,
    minuteTimestamps: [],
    dayCount: 0,
    dayAnchor: startOfUtcDay(Date.now()),
    backoffUntil: null,
    lastError: null,
  };
  buckets.set(rule.key, fresh);
  return fresh;
}

function rolloverDay(bucket: BucketState, now: number): void {
  const currentAnchor = startOfUtcDay(now);
  if (currentAnchor !== bucket.dayAnchor) {
    bucket.dayAnchor = currentAnchor;
    bucket.dayCount = 0;
  }
}

function trimMinuteWindow(bucket: BucketState, now: number): void {
  const cutoff = now - 60_000;
  bucket.minuteTimestamps = bucket.minuteTimestamps.filter((t) => t > cutoff);
}

export class RateLimitExceededError extends Error {
  readonly key: string;
  readonly retryAfterMs: number;
  constructor(key: string, retryAfterMs: number, reason: string) {
    super(`Rate limit exceeded for "${key}": ${reason}. Retry after ${retryAfterMs}ms`);
    this.name = "RateLimitExceededError";
    this.key = key;
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Attempt to consume one slot for the given rule.
 * Throws `RateLimitExceededError` if capped or currently in backoff.
 */
export function consume(rule: RateLimitRule): void {
  const now = Date.now();
  const bucket = getBucket(rule);

  rolloverDay(bucket, now);
  trimMinuteWindow(bucket, now);

  if (bucket.backoffUntil && bucket.backoffUntil > now) {
    throw new RateLimitExceededError(rule.key, bucket.backoffUntil - now, "in backoff window");
  }

  if (rule.perMinute && bucket.minuteTimestamps.length >= rule.perMinute) {
    const oldest = bucket.minuteTimestamps[0];
    const retry = Math.max(0, 60_000 - (now - oldest));
    throw new RateLimitExceededError(rule.key, retry, "per-minute cap reached");
  }

  if (rule.perDay && bucket.dayCount >= rule.perDay) {
    const retry = bucket.dayAnchor + 86_400_000 - now;
    throw new RateLimitExceededError(rule.key, Math.max(retry, 0), "per-day cap reached");
  }

  bucket.minuteTimestamps.push(now);
  bucket.dayCount += 1;
}

/** Report a 429 or transient failure so future consumes back off. */
export function reportBackoff(key: string, retryAfterMs: number, reason: string): void {
  const bucket = buckets.get(key);
  if (!bucket) return;
  bucket.backoffUntil = Date.now() + Math.max(retryAfterMs, 0);
  bucket.lastError = reason;
}

/** Clear any backoff for manual recovery (tests, user reset). */
export function clearBackoff(key: string): void {
  const bucket = buckets.get(key);
  if (!bucket) return;
  bucket.backoffUntil = null;
  bucket.lastError = null;
}

export function snapshot(): RateLimitStatus[] {
  const now = Date.now();
  return Array.from(buckets.values()).map((bucket) => {
    rolloverDay(bucket, now);
    trimMinuteWindow(bucket, now);
    const { rule } = bucket;
    return {
      key: rule.key,
      remainingMinute: rule.perMinute ? Math.max(0, rule.perMinute - bucket.minuteTimestamps.length) : null,
      remainingDay: rule.perDay ? Math.max(0, rule.perDay - bucket.dayCount) : null,
      backoffUntil: bucket.backoffUntil && bucket.backoffUntil > now ? bucket.backoffUntil : null,
      lastError: bucket.lastError,
    };
  });
}

/** For tests only. */
export function __resetRateLimiter(): void {
  buckets.clear();
}
