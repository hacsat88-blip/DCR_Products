import BetterSqlite3 from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../schema";

export type TestDb = BetterSQLite3Database<typeof schema>;

const DDL = [
  `CREATE TABLE portfolio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    market TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    avg_cost REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL,
    note TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE TABLE watchlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    market TEXT NOT NULL,
    name TEXT NOT NULL,
    added_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE UNIQUE INDEX watchlist_code_market_uq ON watchlist (code, market)`,
  `CREATE TABLE price_snapshot (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    market TEXT NOT NULL,
    date TEXT NOT NULL,
    open REAL, high REAL, low REAL, close REAL, volume REAL
  )`,
  `CREATE UNIQUE INDEX price_snapshot_code_market_date_uq ON price_snapshot (code, market, date)`,
  `CREATE TABLE news_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    external_id TEXT NOT NULL,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    lang TEXT,
    published_at INTEGER NOT NULL,
    fetched_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
  )`,
  `CREATE UNIQUE INDEX news_cache_source_external_uq ON news_cache (source, external_id)`,
  `CREATE TABLE llm_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL,
    model TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    expires_at INTEGER NOT NULL
  )`,
  `CREATE INDEX llm_cache_key_idx ON llm_cache (key)`,
  `CREATE TABLE portfolio_snapshot (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    total_value_jpy REAL NOT NULL,
    pnl_jpy REAL NOT NULL
  )`,
];

export function createTestDb(): TestDb {
  const sqlite = new BetterSqlite3(":memory:");
  for (const stmt of DDL) sqlite.exec(stmt);
  return drizzle(sqlite, { schema });
}
