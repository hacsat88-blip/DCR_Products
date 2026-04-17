"use client";

import { useMemo } from "react";
import { Treemap } from "recharts";

export interface SectorTreemapCell {
  symbol: string;
  name?: string;
  sector: string;
  marketCap: number;
  changePct: number;
}

export interface SectorTreemapProps {
  cells: SectorTreemapCell[];
  width?: number;
  height?: number;
  onCellClick?: (symbol: string) => void;
}

interface LeafNodeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  depth?: number;
  symbol?: string;
  changePct?: number;
  onCellClick?: (symbol: string) => void;
}

function intensityColor(changePct: number): string {
  const intensity = Math.min(1, Math.abs(changePct) / 5);
  const alpha = 0.25 + intensity * 0.75;
  if (changePct >= 0) return `rgba(34, 197, 94, ${alpha.toFixed(3)})`;
  return `rgba(249, 112, 102, ${alpha.toFixed(3)})`;
}

function LeafNode(props: LeafNodeProps): JSX.Element | null {
  const { x = 0, y = 0, width = 0, height = 0, depth, symbol, changePct, onCellClick } = props;
  if (typeof symbol !== "string" || depth !== 2) {
    return null;
  }
  const pct = typeof changePct === "number" ? changePct : 0;
  const sign = pct >= 0 ? "+" : "";
  const showLabels = width > 40 && height > 24;
  return (
    <g
      data-testid={`treemap-cell-${symbol}`}
      style={{ cursor: onCellClick ? "pointer" : "default" }}
      onClick={() => onCellClick?.(symbol)}
    >
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={intensityColor(pct)}
        stroke="var(--inp-border, #263042)"
        strokeWidth={1}
      />
      {showLabels ? (
        <>
          <text
            x={x + 6}
            y={y + 14}
            fill="var(--inp-text-primary, #E6EDF7)"
            fontSize={11}
            fontWeight={600}
          >
            {symbol}
          </text>
          <text
            x={x + 6}
            y={y + 28}
            fill="var(--inp-text-secondary, #9AA9BF)"
            fontSize={10}
          >
            {`${sign}${pct.toFixed(2)}%`}
          </text>
        </>
      ) : null}
    </g>
  );
}

export function SectorTreemap({
  cells,
  width = 640,
  height = 360,
  onCellClick,
}: SectorTreemapProps): JSX.Element {
  const data = useMemo(() => {
    const bySector = new Map<string, SectorTreemapCell[]>();
    for (const c of cells) {
      const list = bySector.get(c.sector) ?? [];
      list.push(c);
      bySector.set(c.sector, list);
    }
    return Array.from(bySector.entries()).map(([sector, items]) => ({
      name: sector,
      children: items.map((c) => ({
        name: c.symbol,
        size: Math.max(1, c.marketCap),
        symbol: c.symbol,
        changePct: c.changePct,
      })),
    }));
  }, [cells]);

  if (cells.length === 0) {
    return (
      <div
        role="img"
        aria-label="セクターヒートマップ"
        className="flex items-center justify-center text-sm"
        style={{
          width,
          height,
          color: "var(--inp-text-secondary, #9AA9BF)",
        }}
      >
        表示するセクターデータがありません
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label="セクターヒートマップ"
      className="inp-sector-treemap"
      style={{ width, height }}
    >
      <Treemap
        width={width}
        height={height}
        data={data}
        dataKey="size"
        stroke="var(--inp-border, #263042)"
        fill="transparent"
        isAnimationActive={false}
        content={<LeafNode onCellClick={onCellClick} />}
      />
    </div>
  );
}
