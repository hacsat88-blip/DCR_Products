// ── Cyber-themed chart palette ──
export const CHART_COLORS = {
  mint: '#00ff41',
  blue: '#00e5ff',
  amber: '#ffd700',
  danger: '#ff3355',
  warmAccent: '#ff8800',
  grid: 'rgba(0, 255, 65, 0.06)',
  axis: 'rgba(0, 255, 65, 0.55)',
  tooltipBg: '#050a05',
  tooltipBorder: 'rgba(0, 255, 65, 0.3)',
} as const;

export const CHART_GRID_PROPS = {
  stroke: CHART_COLORS.grid,
  strokeDasharray: '3 6',
  vertical: false as const,
};

export const CHART_AXIS_TICK = {
  fontSize: 11,
  fill: CHART_COLORS.axis,
  fontFamily: 'var(--font-share-tech-mono), monospace',
};

export const CHART_TOOLTIP_STYLE = {
  background: CHART_COLORS.tooltipBg,
  border: `1px solid ${CHART_COLORS.tooltipBorder}`,
  borderRadius: '0px',
  boxShadow: '0 0 12px rgba(0,255,65,.15), 0 4px 16px rgba(0,0,0,.6)',
};

export const ACTIVE_DOT_PROPS = {
  r: 4,
  strokeWidth: 2,
  fill: CHART_COLORS.tooltipBg,
  stroke: CHART_COLORS.mint,
};
