// ────────────────────────────────────────────────
// Backtest Engine — pure TypeScript strategy runner
// ────────────────────────────────────────────────
//
// No external API calls. Given a candle series and a strategy config,
// produce an equity curve, a trade log and aggregate metrics.

export interface Candle {
  t: number; // epoch seconds or ms — engine treats it as opaque ordering
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
}

export type StrategyKind = "sma_cross" | "rsi_reversion" | "buy_and_hold";

export interface BacktestConfig {
  initialCapital: number;
  feePct: number;
  slippagePct: number;
  strategy: StrategyKind;
  params: Record<string, number>;
}

export interface BacktestTrade {
  entryT: number;
  exitT: number;
  entryPrice: number;
  exitPrice: number;
  qty: number;
  pnl: number;
  pnlPct: number;
  reason: string;
}

export interface BacktestMetrics {
  totalReturnPct: number;
  cagr: number;
  sharpe: number;
  maxDrawdownPct: number;
  winRate: number;
  tradeCount: number;
}

export interface EquityPoint {
  t: number;
  value: number;
}

export interface BacktestResult {
  equity: EquityPoint[];
  trades: BacktestTrade[];
  metrics: BacktestMetrics;
  config: BacktestConfig;
}

// ── Indicators ─────────────────────────────────────────

function sma(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  if (period <= 0) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

function rsi(values: number[], period: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null);
  if (period <= 0 || values.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i += 1) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < values.length; i += 1) {
    const diff = values[i] - values[i - 1];
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

// ── Signal generation ───────────────────────────────────

type Signal = "buy" | "sell" | "hold";

function smaCrossSignals(closes: number[], fast: number, slow: number): Signal[] {
  const fastArr = sma(closes, fast);
  const slowArr = sma(closes, slow);
  const signals: Signal[] = new Array(closes.length).fill("hold");
  for (let i = 1; i < closes.length; i += 1) {
    const f = fastArr[i];
    const s = slowArr[i];
    const fp = fastArr[i - 1];
    const sp = slowArr[i - 1];
    if (f == null || s == null || fp == null || sp == null) continue;
    if (fp <= sp && f > s) signals[i] = "buy";
    else if (fp >= sp && f < s) signals[i] = "sell";
  }
  return signals;
}

function rsiReversionSignals(
  closes: number[],
  period: number,
  oversold: number,
  overbought: number,
): Signal[] {
  const rsiArr = rsi(closes, period);
  const signals: Signal[] = new Array(closes.length).fill("hold");
  for (let i = 0; i < closes.length; i += 1) {
    const r = rsiArr[i];
    if (r == null) continue;
    if (r < oversold) signals[i] = "buy";
    else if (r > overbought) signals[i] = "sell";
  }
  return signals;
}

// ── Metrics ────────────────────────────────────────────

function maxDrawdownPct(equity: EquityPoint[]): number {
  let peak = -Infinity;
  let maxDd = 0;
  for (const p of equity) {
    if (p.value > peak) peak = p.value;
    if (peak > 0) {
      const dd = (peak - p.value) / peak;
      if (dd > maxDd) maxDd = dd;
    }
  }
  return maxDd * 100;
}

function dailyReturns(equity: EquityPoint[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < equity.length; i += 1) {
    const prev = equity[i - 1].value;
    const curr = equity[i].value;
    if (prev > 0) out.push(curr / prev - 1);
  }
  return out;
}

function sharpeRatio(returns: number[]): number {
  if (returns.length < 2) return 0;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / (returns.length - 1);
  const std = Math.sqrt(variance);
  if (!Number.isFinite(std) || std === 0) return 0;
  return (mean / std) * Math.sqrt(252);
}

function cagrFor(totalReturnPct: number, nBars: number): number {
  if (nBars <= 1) return 0;
  const years = nBars / 252;
  if (years <= 0) return 0;
  const growth = 1 + totalReturnPct / 100;
  if (growth <= 0) return -100;
  return (Math.pow(growth, 1 / years) - 1) * 100;
}

// ── Main runner ────────────────────────────────────────

export function runBacktest(candles: Candle[], config: BacktestConfig): BacktestResult {
  if (candles.length === 0) {
    return {
      equity: [],
      trades: [],
      metrics: {
        totalReturnPct: 0,
        cagr: 0,
        sharpe: 0,
        maxDrawdownPct: 0,
        winRate: 0,
        tradeCount: 0,
      },
      config,
    };
  }

  const closes = candles.map((c) => c.c);
  const n = candles.length;
  const halfFee = config.feePct / 2;
  const slip = config.slippagePct;

  let signals: Signal[];
  if (config.strategy === "sma_cross") {
    const fast = Math.max(1, Math.floor(config.params.fast ?? 5));
    const slow = Math.max(fast + 1, Math.floor(config.params.slow ?? 20));
    signals = smaCrossSignals(closes, fast, slow);
  } else if (config.strategy === "rsi_reversion") {
    const period = Math.max(2, Math.floor(config.params.period ?? 14));
    const oversold = config.params.oversold ?? 30;
    const overbought = config.params.overbought ?? 70;
    signals = rsiReversionSignals(closes, period, oversold, overbought);
  } else {
    // buy_and_hold: buy at first bar, sell at last bar
    signals = new Array(n).fill("hold");
    signals[0] = "buy";
    signals[n - 1] = "sell";
  }

  let cash = config.initialCapital;
  let qty = 0;
  let entryPrice = 0;
  let entryT = 0;
  const trades: BacktestTrade[] = [];
  const equity: EquityPoint[] = [];

  for (let i = 0; i < n; i += 1) {
    const candle = candles[i];
    const sig = signals[i];

    if (sig === "buy" && qty === 0) {
      const execPrice = candle.c * (1 + slip);
      const feeMultiplier = 1 + halfFee;
      const spend = cash;
      const buyQty = spend / (execPrice * feeMultiplier);
      if (buyQty > 0) {
        qty = buyQty;
        cash -= buyQty * execPrice * feeMultiplier;
        entryPrice = execPrice;
        entryT = candle.t;
      }
    } else if (sig === "sell" && qty > 0) {
      const execPrice = candle.c * (1 - slip);
      const feeMultiplier = 1 - halfFee;
      const proceeds = qty * execPrice * feeMultiplier;
      const cost = qty * entryPrice * (1 + halfFee);
      const pnl = proceeds - cost;
      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
      trades.push({
        entryT,
        exitT: candle.t,
        entryPrice,
        exitPrice: execPrice,
        qty,
        pnl,
        pnlPct,
        reason: config.strategy,
      });
      cash += proceeds;
      qty = 0;
      entryPrice = 0;
      entryT = 0;
    }

    const markToMarket = cash + qty * candle.c;
    equity.push({ t: candle.t, value: markToMarket });
  }

  // Force-close any open position at the final bar (so metrics close out).
  if (qty > 0) {
    const last = candles[n - 1];
    const execPrice = last.c * (1 - slip);
    const feeMultiplier = 1 - halfFee;
    const proceeds = qty * execPrice * feeMultiplier;
    const cost = qty * entryPrice * (1 + halfFee);
    const pnl = proceeds - cost;
    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
    trades.push({
      entryT,
      exitT: last.t,
      entryPrice,
      exitPrice: execPrice,
      qty,
      pnl,
      pnlPct,
      reason: `${config.strategy}:force-close`,
    });
    cash += proceeds;
    qty = 0;
    equity[equity.length - 1] = { t: last.t, value: cash };
  }

  const finalValue = equity[equity.length - 1]?.value ?? config.initialCapital;
  const totalReturnPct =
    config.initialCapital > 0
      ? (finalValue / config.initialCapital - 1) * 100
      : 0;
  const wins = trades.filter((t) => t.pnl > 0).length;
  const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
  const metrics: BacktestMetrics = {
    totalReturnPct,
    cagr: cagrFor(totalReturnPct, n),
    sharpe: sharpeRatio(dailyReturns(equity)),
    maxDrawdownPct: maxDrawdownPct(equity),
    winRate,
    tradeCount: trades.length,
  };

  return { equity, trades, metrics, config };
}
