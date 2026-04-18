import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  doublePrecision,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const portfolio = pgTable("portfolio", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  market: text("market").notNull(),
  name: text("name").notNull(),
  quantity: doublePrecision("quantity").notNull().default(0),
  avgCost: doublePrecision("avg_cost").notNull().default(0),
  currency: text("currency").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

export const watchlist = pgTable(
  "watchlist",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    market: text("market").notNull(),
    name: text("name").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    uqCodeMarket: uniqueIndex("watchlist_code_market_uq").on(t.code, t.market),
  })
);

export const priceSnapshot = pgTable(
  "price_snapshot",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull(),
    market: text("market").notNull(),
    date: text("date").notNull(),
    open: doublePrecision("open"),
    high: doublePrecision("high"),
    low: doublePrecision("low"),
    close: doublePrecision("close"),
    volume: doublePrecision("volume"),
  },
  (t) => ({
    uqCodeMarketDate: uniqueIndex("price_snapshot_code_market_date_uq").on(
      t.code,
      t.market,
      t.date
    ),
  })
);

export const newsCache = pgTable(
  "news_cache",
  {
    id: serial("id").primaryKey(),
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    lang: text("lang"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    uqSourceExternal: uniqueIndex("news_cache_source_external_uq").on(
      t.source,
      t.externalId
    ),
  })
);

export const llmCache = pgTable(
  "llm_cache",
  {
    id: serial("id").primaryKey(),
    key: text("key").notNull(),
    model: text("model").notNull(),
    payload: text("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    keyIdx: index("llm_cache_key_idx").on(t.key),
  })
);

export const portfolioSnapshot = pgTable("portfolio_snapshot", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  totalValueJpy: doublePrecision("total_value_jpy").notNull(),
  pnlJpy: doublePrecision("pnl_jpy").notNull(),
});
