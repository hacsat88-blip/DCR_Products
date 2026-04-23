CREATE TABLE "llm_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"model" text NOT NULL,
	"payload" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"external_id" text NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"lang" text,
	"published_at" timestamp with time zone NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"market" text NOT NULL,
	"name" text NOT NULL,
	"quantity" double precision DEFAULT 0 NOT NULL,
	"avg_cost" double precision DEFAULT 0 NOT NULL,
	"currency" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_snapshot" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"total_value_jpy" double precision NOT NULL,
	"pnl_jpy" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_snapshot" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"market" text NOT NULL,
	"date" text NOT NULL,
	"open" double precision,
	"high" double precision,
	"low" double precision,
	"close" double precision,
	"volume" double precision
);
--> statement-breakpoint
CREATE TABLE "watchlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"market" text NOT NULL,
	"name" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "llm_cache_key_idx" ON "llm_cache" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "news_cache_source_external_uq" ON "news_cache" USING btree ("source","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "price_snapshot_code_market_date_uq" ON "price_snapshot" USING btree ("code","market","date");--> statement-breakpoint
CREATE UNIQUE INDEX "watchlist_code_market_uq" ON "watchlist" USING btree ("code","market");