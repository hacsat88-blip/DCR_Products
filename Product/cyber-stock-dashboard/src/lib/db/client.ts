/* eslint-disable @typescript-eslint/no-require-imports */
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export type Database = BetterSQLite3Database<typeof schema>;

type GlobalCache = {
  __dbInstance?: Database;
  __dbDriver?: "sqlite" | "postgres";
};

const globalCache = globalThis as unknown as GlobalCache;

function resolveDriver(): "sqlite" | "postgres" {
  const d = (process.env.DATABASE_DRIVER ?? "sqlite").toLowerCase();
  return d === "postgres" || d === "pg" ? "postgres" : "sqlite";
}

function createSqliteDb(): Database {
   
  const Database = require("better-sqlite3");
   
  const { drizzle } = require("drizzle-orm/better-sqlite3");
  const url = process.env.DATABASE_URL ?? "file:./local.db";
  const file = url.startsWith("file:") ? url.slice(5) : url;
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  return drizzle(sqlite, { schema }) as Database;
}

function createPostgresDb(): Database {
   
  const { neon } = require("@neondatabase/serverless");
   
  const { drizzle } = require("drizzle-orm/neon-http");
   
  const pgSchema = require("./schema.pg");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for postgres driver");
  const sql = neon(url);
  return drizzle(sql, { schema: pgSchema }) as unknown as Database;
}

export function getDb(): Database {
  const driver = resolveDriver();
  if (globalCache.__dbInstance && globalCache.__dbDriver === driver) {
    return globalCache.__dbInstance;
  }
  const db = driver === "postgres" ? createPostgresDb() : createSqliteDb();
  globalCache.__dbInstance = db;
  globalCache.__dbDriver = driver;
  return db;
}

export async function runMigrations(): Promise<void> {
  const driver = resolveDriver();
  if (driver === "postgres") {
     
    const { migrate } = require("drizzle-orm/neon-http/migrator");
    await migrate(getDb() as never, { migrationsFolder: "./drizzle/pg" });
    return;
  }
   
  const { migrate } = require("drizzle-orm/better-sqlite3/migrator");
  migrate(getDb(), { migrationsFolder: "./drizzle" });
}

export { schema };
