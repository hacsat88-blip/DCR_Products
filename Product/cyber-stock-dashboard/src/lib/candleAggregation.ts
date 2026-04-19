import type { Candle } from "@/lib/providers/types";

/** 日足配列を週足にダウンサンプル (ISO 週・月曜起点) */
export function aggregateWeekly(candles: Candle[]): Candle[] {
  if (candles.length === 0) return [];
  const sorted = [...candles].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
  const buckets = new Map<string, Candle[]>();
  for (const c of sorted) {
    const d = new Date(`${c.date}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) continue;
    const day = d.getUTCDay();
    const offset = (day + 6) % 7;
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - offset);
    const key = monday.toISOString().slice(0, 10);
    const arr = buckets.get(key);
    if (arr) arr.push(c);
    else buckets.set(key, [c]);
  }
  const out: Candle[] = [];
  for (const [date, arr] of buckets) {
    arr.sort((a, b) => (a.date < b.date ? -1 : 1));
    const open = arr[0].open;
    const close = arr[arr.length - 1].close;
    let high = arr[0].high;
    let low = arr[0].low;
    let volume = 0;
    for (const c of arr) {
      if (c.high > high) high = c.high;
      if (c.low < low) low = c.low;
      volume += c.volume;
    }
    out.push({ date, open, high, low, close, volume });
  }
  out.sort((a, b) => (a.date < b.date ? -1 : 1));
  return out;
}
