/**
 * 投信 (ETF) 対象を限定する allowlist。
 * 個別株とは別に「ETF だけ」のフィルタにも使える。
 */
export interface EtfEntry {
  code: string;
  name: string;
}

export const JP_ETF_ALLOWLIST: EtfEntry[] = [
  { code: "1306", name: "NEXT FUNDS TOPIX連動型上場投信" },
  { code: "1321", name: "NEXT FUNDS 日経225連動型上場投信" },
  { code: "1330", name: "iシェアーズ・コア 日経225 ETF" },
  { code: "2558", name: "MAXIS米国株式(S&P500)上場投信" },
  { code: "1655", name: "iシェアーズ S&P500 米国株 ETF" },
  { code: "1545", name: "NEXT FUNDS NASDAQ-100連動型上場投信" },
  { code: "2559", name: "MAXIS全世界株式(オール・カントリー)上場投信" },
  { code: "1475", name: "iシェアーズ・コア TOPIX ETF" },
  { code: "2521", name: "上場インデックスファンド米国株式(S&P500)" },
];

export const US_ETF_ALLOWLIST: EtfEntry[] = [
  { code: "SPY", name: "SPDR S&P 500 ETF Trust" },
  { code: "VOO", name: "Vanguard S&P 500 ETF" },
  { code: "QQQ", name: "Invesco QQQ Trust" },
  { code: "VTI", name: "Vanguard Total Stock Market ETF" },
  { code: "IVV", name: "iShares Core S&P 500 ETF" },
  { code: "DIA", name: "SPDR Dow Jones Industrial Average ETF" },
  { code: "IWM", name: "iShares Russell 2000 ETF" },
  { code: "EFA", name: "iShares MSCI EAFE ETF" },
  { code: "EEM", name: "iShares MSCI Emerging Markets ETF" },
];

const JP_ETF_CODES = new Set(JP_ETF_ALLOWLIST.map((e) => e.code));
const US_ETF_CODES = new Set(US_ETF_ALLOWLIST.map((e) => e.code));

/** J-Quants の listed code は 5桁 (末尾 0) のことがある。先頭4桁に正規化。 */
export function normalizeJpCode(code: string): string {
  if (/^\d{5}$/.test(code) && code.endsWith("0")) {
    return code.slice(0, 4);
  }
  return code;
}

export function isJpEtf(code: string): boolean {
  return JP_ETF_CODES.has(normalizeJpCode(code));
}
export function isUsEtf(code: string): boolean {
  return US_ETF_CODES.has(code.toUpperCase());
}

export function jpEtfName(code: string): string | undefined {
  const c = normalizeJpCode(code);
  return JP_ETF_ALLOWLIST.find((e) => e.code === c)?.name;
}

export function usEtfName(code: string): string | undefined {
  return US_ETF_ALLOWLIST.find((e) => e.code === code.toUpperCase())?.name;
}
