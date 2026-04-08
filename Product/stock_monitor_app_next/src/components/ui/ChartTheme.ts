// Subtle neon chart palette (dark-theme optimized)
export const CHART_COLORS = {
  mint: "#4BD8A0",
  blue: "#45CCE6",
  amber: "#F2C76E",
  danger: "#FF708A",
  warmAccent: "#FF9A66",
  primary: "#45CCE6",
  violet: "#B48CF8",
  pink: "#F184CD",
  teal: "#4CC6C2",
  lime: "#94E08F",
  grid: "rgba(149, 174, 201, 0.10)",
  axis: "rgba(161, 186, 212, 0.66)",
  tooltipBg: "#181F2D",
  tooltipBorder: "rgba(149, 174, 201, 0.28)",
} as const;

export const CHART_SERIES = {
  strategy: CHART_COLORS.mint,
  benchmark: CHART_COLORS.blue,
  score: CHART_COLORS.mint,
  price: CHART_COLORS.blue,
  nikkei: CHART_COLORS.amber,
  signal: CHART_COLORS.amber,
  radar: CHART_COLORS.violet,
  positive: CHART_COLORS.mint,
  negative: CHART_COLORS.danger,
} as const;

export const ACTION_CHART_COLORS = {
  buy: CHART_COLORS.mint,
  wait: CHART_COLORS.blue,
  exclude: CHART_COLORS.danger,
  buy_now: CHART_COLORS.mint,
  wait_earnings: CHART_COLORS.blue,
  wait_pullback: CHART_COLORS.violet,
} as const;

export const CHART_SECTOR_COLORS = [
  CHART_COLORS.mint,
  CHART_COLORS.blue,
  CHART_COLORS.amber,
  CHART_COLORS.violet,
  CHART_COLORS.pink,
  CHART_COLORS.teal,
  CHART_COLORS.warmAccent,
  CHART_COLORS.lime,
] as const;

export const LIGHTWEIGHT_CHART_THEME = {
  layoutTextColor: CHART_COLORS.axis,
  gridLineColor: CHART_COLORS.grid,
  crosshairLineColor: "rgba(161, 186, 212, 0.36)",
  crosshairLabelBackground: "#172131",
  scaleBorderColor: "rgba(149, 174, 201, 0.34)",
  candle: {
    upColor: CHART_SERIES.positive,
    downColor: CHART_SERIES.negative,
    borderUpColor: CHART_SERIES.positive,
    borderDownColor: CHART_SERIES.negative,
    wickUpColor: CHART_SERIES.positive,
    wickDownColor: CHART_SERIES.negative,
  },
  volume: {
    positive: `${CHART_SERIES.positive}3d`, // #4BD8A03d - 61/255 alpha
    negative: `${CHART_SERIES.negative}38`, // #FF708A38 - 56/255 alpha
  },
} as const;

export const CHART_RADAR_SVG_COLORS = {
  grid: CHART_COLORS.grid,
  axis: "rgba(180, 140, 248, 0.24)",
  fill: "rgba(180, 140, 248, 0.14)",
  stroke: CHART_SERIES.radar,
  label: "rgba(210, 190, 248, 0.78)",
} as const;

export const CHART_GRID_PROPS = {
  stroke: CHART_COLORS.grid,
  strokeDasharray: '3 6',
  vertical: false as const,
};

export const CHART_AXIS_TICK = {
  fontSize: 11,
  fill: CHART_COLORS.axis,
  fontFamily: "'Inter', system-ui, sans-serif",
};

export const CHART_TOOLTIP_STYLE = {
  background: CHART_COLORS.tooltipBg,
  border: `1px solid ${CHART_COLORS.tooltipBorder}`,
  borderRadius: '8px',
  boxShadow: '0 4px 16px rgba(0,0,0,.4)',
};

export const ACTIVE_DOT_PROPS = {
  r: 4,
  strokeWidth: 2,
  fill: CHART_COLORS.tooltipBg,
  stroke: CHART_COLORS.blue,
};
