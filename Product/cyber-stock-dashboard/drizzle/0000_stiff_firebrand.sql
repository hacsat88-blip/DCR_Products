CREATE TABLE `llm_cache` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`model` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `llm_cache_key_idx` ON `llm_cache` (`key`);--> statement-breakpoint
CREATE TABLE `news_cache` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`external_id` text NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`lang` text,
	`published_at` integer NOT NULL,
	`fetched_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `news_cache_source_external_uq` ON `news_cache` (`source`,`external_id`);--> statement-breakpoint
CREATE TABLE `portfolio` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`market` text NOT NULL,
	`name` text NOT NULL,
	`quantity` real DEFAULT 0 NOT NULL,
	`avg_cost` real DEFAULT 0 NOT NULL,
	`currency` text NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `portfolio_snapshot` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`total_value_jpy` real NOT NULL,
	`pnl_jpy` real NOT NULL
);
--> statement-breakpoint
CREATE TABLE `price_snapshot` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`market` text NOT NULL,
	`date` text NOT NULL,
	`open` real,
	`high` real,
	`low` real,
	`close` real,
	`volume` real
);
--> statement-breakpoint
CREATE UNIQUE INDEX `price_snapshot_code_market_date_uq` ON `price_snapshot` (`code`,`market`,`date`);--> statement-breakpoint
CREATE TABLE `watchlist` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`market` text NOT NULL,
	`name` text NOT NULL,
	`added_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `watchlist_code_market_uq` ON `watchlist` (`code`,`market`);