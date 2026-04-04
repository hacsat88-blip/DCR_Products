import { formatYen } from "@/lib/format";
import { CHART_TOOLTIP_STYLE } from "@/components/ui/ChartTheme";

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    stroke?: string;
    dataKey: string;
  }>;
  label?: string;
  labelSuffix?: string;
}

function formatValue(dataKey: string, value: number): string {
  if (dataKey === "price") return formatYen(value);
  if (dataKey === "score") return `${value.toFixed(0)} pt`;
  if (dataKey === "strategy" || dataKey === "benchmark" || dataKey === "manager") return `${value.toFixed(1)}`;
  return value.toFixed(1);
}

export function ChartTooltip({ active, payload, label, labelSuffix }: ChartTooltipProps): JSX.Element | null {
  if (!active || !payload?.length) return null;

  const visible = payload.filter((e) => e.value != null);
  if (visible.length === 0) return null;

  return (
    <div style={CHART_TOOLTIP_STYLE} className="px-3 py-2.5">
      <p className="text-[11px] font-medium text-text-muted">
        {label}{labelSuffix ?? ""}
      </p>
      <div className="mt-1.5 space-y-1">
        {visible.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.stroke || entry.color }} />
            <span className="text-text-secondary">{entry.name}</span>
            <span className="ml-auto font-semibold tabular-nums text-text-primary">
              {formatValue(entry.dataKey, entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
