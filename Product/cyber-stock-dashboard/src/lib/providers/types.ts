import { z } from "zod";

export const MarketSchema = z.enum(["JP", "US", "FX", "OTHER"]);
export type Market = z.infer<typeof MarketSchema>;

export const CurrencySchema = z.enum(["JPY", "USD", "EUR", "GBP", "OTHER"]);
export type Currency = z.infer<typeof CurrencySchema>;

export const QuoteSchema = z.object({
  symbol: z.string(),
  price: z.number(),
  change: z.number().optional(),
  changePercent: z.number().optional(),
  currency: CurrencySchema.default("USD"),
  timestamp: z.string(),
});
export type Quote = z.infer<typeof QuoteSchema>;

export const CandleSchema = z.object({
  date: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number().nonnegative(),
  adjustedClose: z.number().optional(),
});
export type Candle = z.infer<typeof CandleSchema>;

export const NewsItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  url: z.string(),
  source: z.string().optional(),
  publishedAt: z.string(),
  symbols: z.array(z.string()).default([]),
  sentiment: z.number().optional(),
  language: z.string().optional(),
});
export type NewsItem = z.infer<typeof NewsItemSchema>;

export const DisclosureSchema = z.object({
  docId: z.string(),
  code: z.string(),
  companyName: z.string().optional(),
  title: z.string(),
  docType: z.string().optional(),
  submittedAt: z.string(),
  url: z.string().optional(),
});
export type Disclosure = z.infer<typeof DisclosureSchema>;

export interface FetchDeps {
  fetchImpl?: typeof fetch;
}
