import { consume, RateLimitExceededError, reportBackoff } from "@/lib/rateLimiter";
import { detectSymbols, stableId } from "../normalize";
import type { NewsItem, NewsRegion, NewsSource } from "../types";

const FETCH_TIMEOUT_MS = 10_000;

function decodeEntities(input: string): string {
  if (!input) return "";
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, n: string) => {
      const code = parseInt(n, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    });
}

function stripTags(input: string): string {
  return decodeEntities(input).replace(/<[^>]+>/g, "").trim();
}

function extractFirst(block: string, pattern: RegExp): string | null {
  const m = block.match(pattern);
  return m ? m[1] : null;
}

function normalizeDate(raw: string | null): string {
  if (raw) {
    const trimmed = raw.trim();
    const parsed = Date.parse(trimmed);
    if (Number.isFinite(parsed)) {
      return new Date(parsed).toISOString();
    }
  }
  return new Date().toISOString();
}

function detectLanguage(text: string): "ja" | "en" {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(text) ? "ja" : "en";
}

function parseItems(xml: string): Array<{
  title: string;
  link: string;
  description: string;
  pubDate: string | null;
}> {
  const items: Array<{ title: string; link: string; description: string; pubDate: string | null }> = [];

  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = stripTags(extractFirst(block, /<title[^>]*>([\s\S]*?)<\/title>/i) ?? "");
    const link = stripTags(extractFirst(block, /<link[^>]*>([\s\S]*?)<\/link>/i) ?? "");
    const description = stripTags(
      extractFirst(block, /<description[^>]*>([\s\S]*?)<\/description>/i) ?? "",
    );
    const pubDate =
      extractFirst(block, /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ??
      extractFirst(block, /<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i);
    if (title || link) {
      items.push({ title, link, description, pubDate: pubDate ? stripTags(pubDate) : null });
    }
  }

  if (items.length === 0) {
    const entryRe = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi;
    while ((m = entryRe.exec(xml)) !== null) {
      const block = m[1];
      const title = stripTags(extractFirst(block, /<title[^>]*>([\s\S]*?)<\/title>/i) ?? "");
      const linkTag = extractFirst(block, /<link\b[^>]*href="([^"]+)"[^>]*\/?>/i);
      const link = linkTag ? decodeEntities(linkTag) : "";
      const description = stripTags(
        extractFirst(block, /<summary[^>]*>([\s\S]*?)<\/summary>/i) ??
          extractFirst(block, /<content[^>]*>([\s\S]*?)<\/content>/i) ??
          "",
      );
      const pubDate =
        extractFirst(block, /<published[^>]*>([\s\S]*?)<\/published>/i) ??
        extractFirst(block, /<updated[^>]*>([\s\S]*?)<\/updated>/i);
      if (title || link) {
        items.push({ title, link, description, pubDate: pubDate ? stripTags(pubDate) : null });
      }
    }
  }

  return items;
}

export async function fetchRssFeed(
  url: string,
  source: NewsSource,
  region: NewsRegion,
  externalSignal?: AbortSignal,
): Promise<NewsItem[]> {
  try {
    consume({ key: "news-rss", perMinute: 30 });
  } catch (err) {
    if (err instanceof RateLimitExceededError) {
      reportBackoff("news-rss", err.retryAfterMs, err.message);
    }
    throw err;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", onExternalAbort, { once: true });
  }

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5" },
    });
    if (!res.ok) {
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after")) * 1000;
        reportBackoff("news-rss", Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60_000, `HTTP 429 from ${url}`);
      }
      throw new Error(`RSS fetch failed: HTTP ${res.status} ${url}`);
    }
    const xml = await res.text();
    const parsed = parseItems(xml);
    const items: NewsItem[] = [];
    for (const p of parsed) {
      if (!p.link) continue;
      const title = p.title;
      const summary = p.description ? p.description.slice(0, 500) : null;
      const text = `${title} ${p.description}`;
      items.push({
        id: stableId(p.link),
        source,
        region,
        title,
        url: p.link,
        summary,
        publishedAt: normalizeDate(p.pubDate),
        symbols: detectSymbols(text),
        language: detectLanguage(text),
      });
    }
    return items;
  } catch (err) {
    if (err instanceof RateLimitExceededError) throw err;
    reportBackoff("news-rss", 30_000, err instanceof Error ? err.message : String(err));
    throw err;
  } finally {
    clearTimeout(timer);
    if (externalSignal) externalSignal.removeEventListener("abort", onExternalAbort);
  }
}
