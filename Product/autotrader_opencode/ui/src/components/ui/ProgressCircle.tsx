interface ProgressCircleProps {
  percentage: number;
  color?: string;
  size?: number;
}

export default function ProgressCircle({ percentage, color = "#3B82F6", size = 32 }: ProgressCircleProps) {
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  const dash = (percentage / 100) * c;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#374151" strokeWidth="3" fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth="3"
        fill="none"
        strokeDasharray={`${dash} ${c - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
