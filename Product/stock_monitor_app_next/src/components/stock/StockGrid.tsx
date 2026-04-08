import React from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { EvaluatedStock } from "@/types/stock";

import { StockCard } from "./StockCard";

interface StockGridProps {
  stocks: EvaluatedStock[];
  selectedId: string | null;
  onSelect: (stockId: string) => void;
  onToggleWatch: (stockId: string) => void;
  onRemove: (stockCode: string) => void;
}

function StockGridInner({ stocks, selectedId, onSelect, onToggleWatch, onRemove }: StockGridProps): JSX.Element {
  if (stocks.length === 0) {
    return (
      <EmptyState
        title="該当銘柄がありません"
        body="検索やフィルタ条件を少し緩めると候補が再表示されます。"
      />
    );
  }

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {stocks.map((stock) => (
        <StockCard
          key={stock.id}
          stock={stock}
          selected={selectedId === stock.id}
          onSelect={onSelect}
          onToggleWatch={onToggleWatch}
          onRemove={onRemove}
        />
      ))}
    </section>
  );
}

export const StockGrid = React.memo(StockGridInner);
