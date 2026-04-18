import type { Config } from "drizzle-kit";

const driver = process.env.DATABASE_DRIVER ?? "sqlite";
const url = process.env.DATABASE_URL ?? "file:./local.db";

const config: Config =
  driver === "postgres"
    ? {
        schema: "./src/lib/db/schema.pg.ts",
        out: "./drizzle/pg",
        dialect: "postgresql",
        dbCredentials: { url },
      }
    : {
        schema: "./src/lib/db/schema.ts",
        out: "./drizzle",
        dialect: "sqlite",
        dbCredentials: { url: url.replace(/^file:/, "") },
      };

export default config;
