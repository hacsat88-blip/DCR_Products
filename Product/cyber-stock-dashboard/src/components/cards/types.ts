import type { Signal } from "@/components/ui";

export type CardFace = "operation" | "audit";

export interface SparklinePoint {
  time: string;
  value: number;
}

export interface OperationData {
  price: number;
  change: number;
  changePercent: number;
  currency?: string;
  sparkline?: SparklinePoint[];
  pnl?: number;
  holdingQty?: number;
  unrealizedPnl?: number;
  updatedAt?: string;
}

export type RadarAxisKey =
  | "movement"
  | "volume"
  | "catalyst"
  | "fundamental"
  | "risk";

export type RadarScores = Record<RadarAxisKey, number>;

export interface AuditScenario {
  short: string;
  mid: string;
  long: string;
}

export interface AuditData {
  scores: RadarScores;
  scenarios: AuditScenario;
  risks: string[];
  signal: Signal;
  totalScore?: number;
}

export const RADAR_AXIS_LABELS: Record<RadarAxisKey, string> = {
  movement: "値動き余地",
  volume: "出来高",
  catalyst: "材料",
  fundamental: "ファンダ",
  risk: "リスク耐性",
};
