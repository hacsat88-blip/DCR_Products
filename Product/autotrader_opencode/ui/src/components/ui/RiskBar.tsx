interface RiskBarProps {
  budget: number;
  maxRisk?: number;
}

export default function RiskBar({ budget, maxRisk = 3000 }: RiskBarProps) {
  // budget は負数: -maxRisk=余裕あり、0=上限到達。使用率: (maxRisk + budget) / maxRisk
  const used = Math.min(100, Math.max(0, ((maxRisk + budget) / maxRisk) * 100));
  const color = used > 80 ? "bg-red-500" : used > 50 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-400 mb-1 mt-1">
        <span>リスク使用量</span>
        <span>残余予算: ¥{Math.abs(budget).toLocaleString()}</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full transition-all duration-500 ${color}`} style={{ width: `${used}%` }} />
      </div>
      <div className="text-right text-[10px] text-gray-500 mt-0.5">
        {used.toFixed(0)}% / 上限 ¥{maxRisk.toLocaleString()}
      </div>
    </div>
  );
}
