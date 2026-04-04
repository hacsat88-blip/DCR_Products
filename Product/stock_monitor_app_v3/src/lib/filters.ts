import { EvaluatedStock, SortKey, StockFilters } from "@/types/stock";

export const DEFAULT_FILTERS: StockFilters = {
  query: "",
  priceMin: null,
  priceMax: null,
  sector: "all",
  action: "all",
  marketCapBand: "all",
  revenueGrowthMin: null,
  opGrowthMin: null,
  operatingCFMin: null,
  dividend: "all",
  perMax: null,
  pbrMax: null,
  watch: "all"
};

function inMarketCapBand(marketCap: number, band: StockFilters["marketCapBand"]): boolean {
  if (band === "all") {
    return true;
  }
  if (band === "small") {
    return marketCap < 300_000_000_000;
  }
  if (band === "mid") {
    return marketCap >= 300_000_000_000 && marketCap < 700_000_000_000;
  }
  return marketCap >= 700_000_000_000;
}

function compareOptionalMin(value: number | null, min: number | null): boolean {
  if (min === null) {
    return true;
  }
  if (value === null) {
    return false;
  }
  return value >= min;
}

function compareOptionalMax(value: number | null, max: number | null): boolean {
  if (max === null) {
    return true;
  }
  if (value === null) {
    return false;
  }
  return value <= max;
}

export function filterStocks(stocks: EvaluatedStock[], filters: StockFilters): EvaluatedStock[] {
  const query = filters.query.trim().toLowerCase();

  return stocks.filter((stock) => {
    const searchableText = [
      stock.name,
      stock.code,
      stock.oneLiner,
      stock.summary,
      stock.sector,
      stock.themeTags.join(" ")
    ]
      .join(" ")
      .toLowerCase();

    const matchesQuery = !query || searchableText.includes(query);
    const matchesPriceMin = filters.priceMin === null || stock.price >= filters.priceMin;
    const matchesPriceMax = filters.priceMax === null || stock.price <= filters.priceMax;
    const matchesSector = filters.sector === "all" || stock.sector === filters.sector;
    const matchesAction = filters.action === "all" || stock.evaluatedAction === filters.action;
    const matchesMarketCap = inMarketCapBand(stock.marketCap, filters.marketCapBand);
    const matchesRevenueGrowth = compareOptionalMin(stock.revenueGrowth, filters.revenueGrowthMin);
    const matchesOpGrowth = compareOptionalMin(stock.opGrowth, filters.opGrowthMin);
    const matchesOperatingCF = compareOptionalMin(stock.operatingCF, filters.operatingCFMin);
    const matchesDividend =
      filters.dividend === "all" ||
      (filters.dividend === "with" && (stock.dividendYield ?? 0) > 0) ||
      (filters.dividend === "without" && (stock.dividendYield ?? 0) <= 0);
    const matchesPER = compareOptionalMax(stock.per, filters.perMax);
    const matchesPBR = compareOptionalMax(stock.pbr, filters.pbrMax);
    const watched = Boolean(stock.watched);
    const matchesWatch =
      filters.watch === "all" ||
      (filters.watch === "watching" && watched) ||
      (filters.watch === "not_watching" && !watched);

    return (
      matchesQuery &&
      matchesPriceMin &&
      matchesPriceMax &&
      matchesSector &&
      matchesAction &&
      matchesMarketCap &&
      matchesRevenueGrowth &&
      matchesOpGrowth &&
      matchesOperatingCF &&
      matchesDividend &&
      matchesPER &&
      matchesPBR &&
      matchesWatch
    );
  });
}

export function sortStocks(stocks: EvaluatedStock[], sortKey: SortKey): EvaluatedStock[] {
  const copied = [...stocks];

  switch (sortKey) {
    case "price_asc":
      copied.sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      copied.sort((a, b) => b.price - a.price);
      break;
    case "revenue_growth_desc":
      copied.sort((a, b) => (b.revenueGrowth ?? -Infinity) - (a.revenueGrowth ?? -Infinity));
      break;
    case "op_growth_desc":
      copied.sort((a, b) => (b.opGrowth ?? -Infinity) - (a.opGrowth ?? -Infinity));
      break;
    case "score_desc":
    default:
      copied.sort((a, b) => b.score - a.score);
      break;
  }

  return copied;
}
