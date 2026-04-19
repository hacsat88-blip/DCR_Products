export interface StockSummary {
  id: string;
  ticker: string;
  name: string;
  nameJp?: string;
  sector: string;
  price: number;
  change: number;
  changePct: number;
  currency: 'JPY' | 'USD';
  spark?: number[];
  totalScore?: number;
}

export interface NewsRecord {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary?: string;
  tag?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface Holding extends StockSummary {
  quantity: number;
  cost: number;
  marketValue: number;
  pl: number;
  plPct: number;
  weight: number;
}

export interface ScenarioRowData {
  horizon: string;
  bull: string;
  base: string;
  bear: string;
}
