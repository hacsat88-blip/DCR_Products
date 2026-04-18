import { desc, lt, sql } from "drizzle-orm";
import type { Database } from "../client";
import { newsCache, type NewNewsCache, type NewsCache } from "../schema";

export function getRecentNews(db: Database, limit = 50): NewsCache[] {
  return db
    .select()
    .from(newsCache)
    .orderBy(desc(newsCache.publishedAt))
    .limit(limit)
    .all();
}

export function upsertManyNews(
  db: Database,
  items: NewNewsCache[]
): number {
  if (items.length === 0) return 0;
  db.insert(newsCache)
    .values(items)
    .onConflictDoUpdate({
      target: [newsCache.source, newsCache.externalId],
      set: {
        title: sql`excluded.title`,
        summary: sql`excluded.summary`,
        url: sql`excluded.url`,
        publishedAt: sql`excluded.published_at`,
      },
    })
    .run();
  return items.length;
}

export function pruneExpiredNews(db: Database, olderThan: Date): void {
  db.delete(newsCache).where(lt(newsCache.fetchedAt, olderThan)).run();
}
