import { sql } from "drizzle-orm";
import {
  sqliteTable,
  integer,
  text,
  real,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

export const portfolio = sqliteTable("portfolio", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull(),
  market: text("market", { enum: ["JP", "US"] }).notNull(),
  name: text("name").notNull(),
  quantity: real("quantity").notNull().default(0),
  avgCost: real("avg_cost").notNull().default(0),
  currency: text("currency", { enum: ["JPY", "USD"] }).notNull(),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const watchlist = sqliteTable(
  "watchlist",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    code: text("code").notNull(),
    market: text("market", { enum: ["JP", "US"] }).notNull(),
    name: text("name").notNull(),
    addedAt: integer("added_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    uqCodeMarket: uniqueIndex("watchlist_code_market_uq").on(t.code, t.market),
  })
);

export const priceSnapshot = sqliteTable(
  "price_snapshot",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    code: text("code").notNull(),
    market: text("market", { enum: ["JP", "US"] }).notNull(),
    date: text("date").notNull(),
    open: real("open"),
    high: real("high"),
    low: real("low"),
    close: real("close"),
    volume: real("volume"),
  },
  (t) => ({
    uqCodeMarketDate: uniqueIndex("price_snapshot_code_market_date_uq").on(
      t.code,
      t.market,
      t.date
    ),
  })
);

export const newsCache = sqliteTable(
  "news_cache",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    lang: text("lang"),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }).notNull(),
    fetchedAt: integer("fetched_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    uqSourceExternal: uniqueIndex("news_cache_source_external_uq").on(
      t.source,
      t.externalId
    ),
  })
);

export const llmCache = sqliteTable(
  "llm_cache",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    key: text("key").notNull(),
    model: text("model").notNull(),
    payload: text("payload").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => ({
    keyIdx: index("llm_cache_key_idx").on(t.key),
  })
);

export const portfolioSnapshot = sqliteTable("portfolio_snapshot", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  totalValueJpy: real("total_value_jpy").notNull(),
  pnlJpy: real("pnl_jpy").notNull(),
});

export type Portfolio = typeof portfolio.$inferSelect;
export type NewPortfolio = typeof portfolio.$inferInsert;
export type Watchlist = typeof watchlist.$inferSelect;
export type NewWatchlist = typeof watchlist.$inferInsert;
export type PriceSnapshot = typeof priceSnapshot.$inferSelect;
export type NewPriceSnapshot = typeof priceSnapshot.$inferInsert;
export type NewsCache = typeof newsCache.$inferSelect;
export type NewNewsCache = typeof newsCache.$inferInsert;
export type LlmCache = typeof llmCache.$inferSelect;
export type NewLlmCache = typeof llmCache.$inferInsert;
export type PortfolioSnapshot = typeof portfolioSnapshot.$inferSelect;
export type NewPortfolioSnapshot = typeof portfolioSnapshot.$inferInsert;
