// ────────────────────────────────────────────────
// Market Data Fetcher for AI Navigator
// ────────────────────────────────────────────────
//
// Fetches real-time market data from Yahoo Finance
// to inject factual context into Gemini prompts.
// This prevents Gemini from hallucinating prices and market conditions.

const YAHOO_CHART_ENDPOINT = "https://query1.finance.yahoo.com/v8/finance/chart";
const FETCH_TIMEOUT_MS = 10_000;

// ── Market indices to track ──

const MARKET_INDICES: Record<string, { symbol: string; label: string }> = {
  nikkei: { symbol: "^N225", label: "日経平均" },
  topix: { symbol: "^TOPX", label: "TOPIX" },
  sp500: { symbol: "^GSPC", label: "S&P 500" },
  dow: { symbol: "^DJI", label: "NYダウ" },
  nasdaq: { symbol: "^IXIC", label: "NASDAQ" },
  usdjpy: { symbol: "JPY=X", label: "USD/JPY" },
  vix: { symbol: "^VIX", label: "VIX" },
};

// ── Sector ETFs for sector analysis ──

const JP_SECTOR_ETFS: Record<string, { symbol: string; label: string }> = {
  tech: { symbol: "1627.T", label: "電機・精密" },
  bank: { symbol: "1615.T", label: "銀行" },
  auto: { symbol: "1622.T", label: "輸送機" },
  pharma: { symbol: "1621.T", label: "医薬品" },
  realestate: { symbol: "1633.T", label: "不動産" },
};

// ── Bond Yields ──

const BOND_YIELDS: Record<string, { symbol: string; label: string }> = {
  us10y: { symbol: "^TNX", label: "米国10年債利回り" },
};

// ── Additional FX pairs ──

const EXTRA_FX: Record<string, { symbol: string; label: string }> = {
  eurjpy: { symbol: "EURJPY=X", label: "EUR/JPY" },
  cnyjpy: { symbol: "CNYJPY=X", label: "CNY/JPY" },
};

/** Result from fetching a single quote. */
export interface MarketQuote {
  symbol: string;
  label: string;
  price: number | null;
  changePercent: number | null;
  previousClose: number | null;
}

/** Aggregated macro data to inject into Gemini prompts. */
export interface MacroMarketData {
  fetchedAt: string;
  indices: MarketQuote[];
  topSectors: MarketQuote[];
  summary: string;
}

/** Aggregated stock fundamentals for a candidate stock. */
export interface StockFundamentals {
  code: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  marketCap: number | null;
  per: number | null;
  pbr: number | null;
  dividendYield: number | null;
  eps: number | null;
  sector: string | null;
}

/**
 * Fetches a quote from Yahoo Finance chart API.
 */
async function fetchYahooQuote(symbol: string, label: string): Promise<MarketQuote> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const url = `${YAHOO_CHART_ENDPOINT}/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      signal: controller.signal,
    });

    if (!response.ok) {
      return { symbol, label, price: null, changePercent: null, previousClose: null };
    }

    const json = await response.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) {
      return { symbol, label, price: null, changePercent: null, previousClose: null };
    }

    const price = meta.regularMarketPrice ?? null;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? null;
    const changePercent =
      price != null && prevClose != null && prevClose !== 0
        ? ((price - prevClose) / prevClose) * 100
        : null;

    return { symbol, label, price, changePercent, previousClose: prevClose };
  } catch {
    return { symbol, label, price: null, changePercent: null, previousClose: null };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fetches current macro market data (indices + sectors).
 * Never throws — returns partial data on failure.
 */
export async function fetchMacroMarketData(
  market: "JP" | "US" | "BOTH" = "BOTH",
): Promise<MacroMarketData> {
  // Select which indices to fetch based on market scope
  const indexKeys =
    market === "JP"
      ? ["nikkei", "topix", "usdjpy", "vix"]
      : market === "US"
        ? ["sp500", "dow", "nasdaq", "vix"]
        : ["nikkei", "sp500", "dow", "usdjpy", "vix"];

  const indexEntries = indexKeys
    .map((k) => MARKET_INDICES[k])
    .filter(Boolean);

  const sectorEntries = market !== "US"
    ? Object.values(JP_SECTOR_ETFS)
    : [];

  // Bond yields and extra FX
  const bondEntries = Object.values(BOND_YIELDS);
  const fxEntries = market !== "US" ? Object.values(EXTRA_FX) : [];

  // Fetch all in parallel
  const [indexResults, sectorResults, bondResults, fxResults] = await Promise.all([
    Promise.all(indexEntries.map((e) => fetchYahooQuote(e.symbol, e.label))),
    Promise.all(sectorEntries.map((e) => fetchYahooQuote(e.symbol, e.label))),
    Promise.all(bondEntries.map((e) => fetchYahooQuote(e.symbol, e.label))),
    Promise.all(fxEntries.map((e) => fetchYahooQuote(e.symbol, e.label))),
  ]);

  // Build human-readable summary for Gemini
  const lines: string[] = [];
  for (const q of indexResults) {
    if (q.price != null) {
      const chg = q.changePercent != null ? ` (${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}%)` : "";
      lines.push(`${q.label}: ${q.price.toLocaleString()}${chg}`);
    }
  }
  for (const q of sectorResults) {
    if (q.price != null && q.changePercent != null) {
      lines.push(`${q.label}: ${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}%`);
    }
  }
  for (const q of bondResults) {
    if (q.price != null) {
      lines.push(`${q.label}: ${q.price.toFixed(3)}%`);
    }
  }
  for (const q of fxResults) {
    if (q.price != null) {
      const chg = q.changePercent != null ? ` (${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}%)` : "";
      lines.push(`${q.label}: ${q.price.toFixed(2)}${chg}`);
    }
  }

  return {
    fetchedAt: new Date().toISOString(),
    indices: [...indexResults, ...bondResults, ...fxResults],
    topSectors: sectorResults,
    summary: lines.length > 0
      ? `本日の市況 (${new Date().toISOString().slice(0, 10)}):\n${lines.join("\n")}`
      : "市況データを取得できませんでした。",
  };
}

/**
 * Fetches real fundamentals for a list of stock codes
 * using Yahoo Finance. Returns whatever data is available.
 */
export async function fetchStockFundamentals(
  codes: string[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _market: "JP" | "US" | "BOTH" = "JP",
): Promise<StockFundamentals[]> {
  // Convert codes to Yahoo symbols
  const symbols = codes.map((code) => {
    // If it already looks like a US symbol (contains letters), keep as-is
    if (/[A-Za-z]/.test(code)) return code;
    // Japanese 4-digit codes get .T suffix
    if (/^\d{4}$/.test(code)) return `${code}.T`;
    return code;
  });

  const results: StockFundamentals[] = [];

  // Fetch quotes in batches of 5 to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (symbol, idx) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        try {
          const url = `${YAHOO_CHART_ENDPOINT}/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
          const response = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
            signal: controller.signal,
          });

          if (!response.ok) {
            return {
              code: codes[i + idx],
              name: symbol,
              price: null, changePercent: null, marketCap: null,
              per: null, pbr: null, dividendYield: null, eps: null, sector: null,
            };
          }

          const json = await response.json();
          const meta = json?.chart?.result?.[0]?.meta;

          const price = meta?.regularMarketPrice ?? null;
          const prevClose = meta?.chartPreviousClose ?? meta?.previousClose ?? null;
          const changePercent =
            price != null && prevClose != null && prevClose !== 0
              ? ((price - prevClose) / prevClose) * 100
              : null;

          return {
            code: codes[i + idx],
            name: meta?.shortName ?? meta?.longName ?? symbol.replace(".T", ""),
            price,
            changePercent,
            marketCap: null, // Not available from chart endpoint
            per: null,
            pbr: null,
            dividendYield: null,
            eps: null,
            sector: null,
          };
        } catch {
          return {
            code: codes[i + idx],
            name: symbol,
            price: null, changePercent: null, marketCap: null,
            per: null, pbr: null, dividendYield: null, eps: null, sector: null,
          };
        } finally {
          clearTimeout(timeout);
        }
      }),
    );

    results.push(...batchResults);
  }

  return results;
}
