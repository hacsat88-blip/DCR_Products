import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface DataPoint {
  time: string;
  pnl: number;
}

interface Props {
  data: DataPoint[];
}

export default function MiniCumulativeChart({ data }: Props) {
  if (data.length <= 1) return null;

  return (
    <div className="h-32 mb-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="time" stroke="#4b5563" tick={{ fontSize: 9 }} />
          <YAxis stroke="#4b5563" tick={{ fontSize: 9 }} width={50} />
          <Tooltip
            contentStyle={{ background: "#111827", border: "1px solid #374151", fontSize: 11 }}
            labelStyle={{ color: "#9ca3af" }}
          />
          <ReferenceLine y={0} stroke="#374151" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="pnl" stroke="#3B82F6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
