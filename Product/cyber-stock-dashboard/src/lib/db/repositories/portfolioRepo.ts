import { eq } from "drizzle-orm";
import type { Database } from "../client";
import { portfolio, type NewPortfolio, type Portfolio } from "../schema";

export function listPortfolio(db: Database): Portfolio[] {
  return db.select().from(portfolio).all();
}

export function getPortfolioById(
  db: Database,
  id: number
): Portfolio | undefined {
  return db.select().from(portfolio).where(eq(portfolio.id, id)).get();
}

export function upsertPortfolio(
  db: Database,
  input: NewPortfolio & { id?: number }
): Portfolio {
  const now = new Date();
  if (input.id != null) {
    const updated = db
      .update(portfolio)
      .set({ ...input, updatedAt: now })
      .where(eq(portfolio.id, input.id))
      .returning()
      .get();
    if (updated) return updated;
  }
  const inserted = db
    .insert(portfolio)
    .values({ ...input, createdAt: now, updatedAt: now })
    .returning()
    .get();
  return inserted;
}

export function removePortfolio(db: Database, id: number): void {
  db.delete(portfolio).where(eq(portfolio.id, id)).run();
}
