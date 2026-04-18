/**
 * 監視対象 RSS フィード一覧。
 * 無料・無認証で取得できる日米経済中心のソース。
 * 個別フィードが落ちても aggregator 側 Promise.allSettled で吸収される想定。
 */

export interface RssSource {
  /** 内部識別子（newsCache.source カラムに保存） */
  id: string;
  /** 表示名 */
  name: string;
  /** フィード URL */
  url: string;
  /** 主要言語 (ISO 639-1) */
  lang: "ja" | "en";
  /** 主たる対象市場 */
  market: "JP" | "US" | "GLOBAL";
}

export const RSS_SOURCES: RssSource[] = [
  {
    id: "yahoo-finance-us",
    name: "Yahoo Finance (US)",
    url: "https://finance.yahoo.com/news/rssindex",
    lang: "en",
    market: "US",
  },
  {
    id: "yahoo-finance-jp",
    name: "Yahoo!ニュース ビジネス (JP)",
    url: "https://news.yahoo.co.jp/rss/topics/business.xml",
    lang: "ja",
    market: "JP",
  },
  {
    id: "nhk-business",
    name: "NHK ニュース ビジネス",
    url: "https://www.nhk.or.jp/rss/news/cat5.xml",
    lang: "ja",
    market: "JP",
  },
  {
    id: "investing-jp",
    name: "Investing.com Japan",
    url: "https://jp.investing.com/rss/news.rss",
    lang: "ja",
    market: "GLOBAL",
  },
  {
    id: "marketwatch-top",
    name: "MarketWatch Top Stories",
    url: "https://feeds.marketwatch.com/marketwatch/topstories/",
    lang: "en",
    market: "US",
  },
  {
    id: "cnbc-business",
    name: "CNBC Business News",
    url: "https://www.cnbc.com/id/10001147/device/rss/rss.html",
    lang: "en",
    market: "US",
  },
];
