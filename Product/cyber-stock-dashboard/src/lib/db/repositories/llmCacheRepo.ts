import { eq, lt } from "drizzle-orm";
import type { Database } from "../client";
import { llmCache, type LlmCache } from "../schema";

export function getLlmCache(
  db: Database,
  key: string,
  now: Date = new Date()
): LlmCache | undefined {
  const rows = db
    .select()
    .from(llmCache)
    .where(eq(llmCache.key, key))
    .all();
  return rows.find((r) => r.expiresAt > now);
}

export function setLlmCache(
  db: Database,
  args: { key: string; model: string; payload: string; ttlMs: number }
): LlmCache {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + args.ttlMs);
  return db
    .insert(llmCache)
    .values({
      key: args.key,
      model: args.model,
      payload: args.payload,
      createdAt: now,
      expiresAt,
    })
    .returning()
    .get();
}

export function invalidateLlmCache(db: Database, key: string): void {
  db.delete(llmCache).where(eq(llmCache.key, key)).run();
}

export function pruneExpiredLlmCache(
  db: Database,
  now: Date = new Date()
): void {
  db.delete(llmCache).where(lt(llmCache.expiresAt, now)).run();
}
