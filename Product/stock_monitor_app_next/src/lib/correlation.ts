export function pearson(a: number[], b: number[]): number {
  if (!Array.isArray(a) || !Array.isArray(b)) return NaN;
  const n = a.length;
  if (n === 0 || n !== b.length) return NaN;
  let sumA = 0;
  let sumB = 0;
  let sumAB = 0;
  let sumA2 = 0;
  let sumB2 = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return NaN;
    sumA += x;
    sumB += y;
    sumAB += x * y;
    sumA2 += x * x;
    sumB2 += y * y;
  }
  const num = n * sumAB - sumA * sumB;
  const den = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));
  if (den === 0) return NaN;
  return num / den;
}

export function correlationMatrix(
  series: Record<string, number[]>,
): { labels: string[]; matrix: number[][] } {
  const labels = Object.keys(series);
  const matrix: number[][] = labels.map((_, i) =>
    labels.map((_, j) => {
      if (i === j) return 1;
      const a = series[labels[i]!]!;
      const b = series[labels[j]!]!;
      return pearson(a, b);
    }),
  );
  return { labels, matrix };
}
