// ────────────────────────────────────────────────
// ETF Universe — JP and US curated lists
// ────────────────────────────────────────────────
//
// Static, license-friendly sources (issuer disclosures). Expand freely;
// the shape is intentionally small so front-end filtering stays cheap.

export interface EtfEntry {
  symbol: string; // "1306" or "SPY"
  exchange: "TSE" | "NYSE" | "NASDAQ" | "AMEX";
  name: string;
  category: "Equity" | "Bond" | "Commodity" | "REIT" | "Thematic" | "Multi-Asset";
  region: "JP" | "US" | "Global" | "DM" | "EM";
  expenseRatio: number; // percent, e.g. 0.17
  currency: "JPY" | "USD";
  issuer: string;
}

export const ETF_UNIVERSE_JP: readonly EtfEntry[] = [
  { symbol: "1306", exchange: "TSE", name: "NEXT FUNDS TOPIX連動型上場投信", category: "Equity", region: "JP", expenseRatio: 0.0594, currency: "JPY", issuer: "野村AM" },
  { symbol: "1321", exchange: "TSE", name: "NEXT FUNDS 日経225連動型上場投信", category: "Equity", region: "JP", expenseRatio: 0.198, currency: "JPY", issuer: "野村AM" },
  { symbol: "1330", exchange: "TSE", name: "日経225連動型上場投資信託", category: "Equity", region: "JP", expenseRatio: 0.22, currency: "JPY", issuer: "大和AM" },
  { symbol: "1343", exchange: "TSE", name: "NEXT FUNDS 東証REIT指数連動型", category: "REIT", region: "JP", expenseRatio: 0.155, currency: "JPY", issuer: "野村AM" },
  { symbol: "1348", exchange: "TSE", name: "MAXIS トピックス上場投信", category: "Equity", region: "JP", expenseRatio: 0.066, currency: "JPY", issuer: "三菱UFJAM" },
  { symbol: "1475", exchange: "TSE", name: "iシェアーズ・コア TOPIX ETF", category: "Equity", region: "JP", expenseRatio: 0.066, currency: "JPY", issuer: "ブラックロック" },
  { symbol: "1545", exchange: "TSE", name: "NEXT FUNDS NASDAQ-100連動", category: "Equity", region: "US", expenseRatio: 0.2, currency: "JPY", issuer: "野村AM" },
  { symbol: "1557", exchange: "TSE", name: "SPDR S&P500 ETF", category: "Equity", region: "US", expenseRatio: 0.0945, currency: "JPY", issuer: "ステート・ストリート" },
  { symbol: "1655", exchange: "TSE", name: "iシェアーズ S&P500 ETF", category: "Equity", region: "US", expenseRatio: 0.0825, currency: "JPY", issuer: "ブラックロック" },
  { symbol: "2558", exchange: "TSE", name: "MAXIS 米国株式(S&P500)上場投信", category: "Equity", region: "US", expenseRatio: 0.077, currency: "JPY", issuer: "三菱UFJAM" },
  { symbol: "2559", exchange: "TSE", name: "MAXIS 全世界株式(オール・カントリー)", category: "Equity", region: "Global", expenseRatio: 0.0858, currency: "JPY", issuer: "三菱UFJAM" },
  { symbol: "2621", exchange: "TSE", name: "iシェアーズ 米国債20年超 ETF(為替ヘッジあり)", category: "Bond", region: "US", expenseRatio: 0.154, currency: "JPY", issuer: "ブラックロック" },
  { symbol: "2644", exchange: "TSE", name: "グローバルX 半導体日本株式 ETF", category: "Thematic", region: "JP", expenseRatio: 0.649, currency: "JPY", issuer: "Global X Japan" },
] as const;

export const ETF_UNIVERSE_US: readonly EtfEntry[] = [
  { symbol: "SPY", exchange: "NYSE", name: "SPDR S&P 500 ETF Trust", category: "Equity", region: "US", expenseRatio: 0.0945, currency: "USD", issuer: "State Street" },
  { symbol: "VOO", exchange: "NYSE", name: "Vanguard S&P 500 ETF", category: "Equity", region: "US", expenseRatio: 0.03, currency: "USD", issuer: "Vanguard" },
  { symbol: "IVV", exchange: "NYSE", name: "iShares Core S&P 500 ETF", category: "Equity", region: "US", expenseRatio: 0.03, currency: "USD", issuer: "BlackRock" },
  { symbol: "QQQ", exchange: "NASDAQ", name: "Invesco QQQ Trust", category: "Equity", region: "US", expenseRatio: 0.2, currency: "USD", issuer: "Invesco" },
  { symbol: "VTI", exchange: "NYSE", name: "Vanguard Total Stock Market ETF", category: "Equity", region: "US", expenseRatio: 0.03, currency: "USD", issuer: "Vanguard" },
  { symbol: "VT", exchange: "NYSE", name: "Vanguard Total World Stock ETF", category: "Equity", region: "Global", expenseRatio: 0.06, currency: "USD", issuer: "Vanguard" },
  { symbol: "VEA", exchange: "NYSE", name: "Vanguard FTSE Developed Markets ETF", category: "Equity", region: "DM", expenseRatio: 0.05, currency: "USD", issuer: "Vanguard" },
  { symbol: "VWO", exchange: "NYSE", name: "Vanguard FTSE Emerging Markets ETF", category: "Equity", region: "EM", expenseRatio: 0.07, currency: "USD", issuer: "Vanguard" },
  { symbol: "AGG", exchange: "NYSE", name: "iShares Core U.S. Aggregate Bond ETF", category: "Bond", region: "US", expenseRatio: 0.03, currency: "USD", issuer: "BlackRock" },
  { symbol: "BND", exchange: "NASDAQ", name: "Vanguard Total Bond Market ETF", category: "Bond", region: "US", expenseRatio: 0.03, currency: "USD", issuer: "Vanguard" },
  { symbol: "TLT", exchange: "NASDAQ", name: "iShares 20+ Year Treasury Bond ETF", category: "Bond", region: "US", expenseRatio: 0.15, currency: "USD", issuer: "BlackRock" },
  { symbol: "GLD", exchange: "NYSE", name: "SPDR Gold Shares", category: "Commodity", region: "Global", expenseRatio: 0.4, currency: "USD", issuer: "State Street" },
  { symbol: "IAU", exchange: "NYSE", name: "iShares Gold Trust", category: "Commodity", region: "Global", expenseRatio: 0.25, currency: "USD", issuer: "BlackRock" },
  { symbol: "SOXX", exchange: "NASDAQ", name: "iShares Semiconductor ETF", category: "Thematic", region: "US", expenseRatio: 0.35, currency: "USD", issuer: "BlackRock" },
  { symbol: "SMH", exchange: "NASDAQ", name: "VanEck Semiconductor ETF", category: "Thematic", region: "US", expenseRatio: 0.35, currency: "USD", issuer: "VanEck" },
  { symbol: "XLK", exchange: "NYSE", name: "Technology Select Sector SPDR Fund", category: "Equity", region: "US", expenseRatio: 0.09, currency: "USD", issuer: "State Street" },
  { symbol: "XLF", exchange: "NYSE", name: "Financial Select Sector SPDR Fund", category: "Equity", region: "US", expenseRatio: 0.09, currency: "USD", issuer: "State Street" },
  { symbol: "XLE", exchange: "NYSE", name: "Energy Select Sector SPDR Fund", category: "Equity", region: "US", expenseRatio: 0.09, currency: "USD", issuer: "State Street" },
  { symbol: "XLV", exchange: "NYSE", name: "Health Care Select Sector SPDR Fund", category: "Equity", region: "US", expenseRatio: 0.09, currency: "USD", issuer: "State Street" },
  { symbol: "VNQ", exchange: "NYSE", name: "Vanguard Real Estate ETF", category: "REIT", region: "US", expenseRatio: 0.13, currency: "USD", issuer: "Vanguard" },
  { symbol: "SCHD", exchange: "NYSE", name: "Schwab US Dividend Equity ETF", category: "Equity", region: "US", expenseRatio: 0.06, currency: "USD", issuer: "Schwab" },
] as const;

export const ETF_UNIVERSE = {
  JP: ETF_UNIVERSE_JP,
  US: ETF_UNIVERSE_US,
} as const;
