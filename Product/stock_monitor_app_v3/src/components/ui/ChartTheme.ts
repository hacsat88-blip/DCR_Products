export const CHART_COLORS = {
  mint: '#5bf0ba',
  blue: '#8bb0ff',
  amber: '#ffc772',
  danger: '#ff8798',
  warmAccent: '#e8a87c',
  grid: 'rgba(255, 255, 255, 0.05)',
  axis: 'rgba(90, 113, 148, 0.9)',
  tooltipBg: '#132238',
  tooltipBorder: '#1e3050',
} as const;

export const CHART_GRID_PROPS = {
  stroke: CHART_COLORS.grid,
  strokeDasharray: '3 6',
  vertical: false as const,
};

export const CHART_AXIS_TICK = {
  fontSize: 11,
  fill: CHART_COLORS.axis,
};

export const CHART_TOOLTIP_STYLE = {
  background: CHART_COLORS.tooltipBg,
  border: `1px solid ${CHART_COLORS.tooltipBorder}`,
  borderRadius: '12px',
  boxShadow: '0 8px 32px rgba(0,0,0,.4), 0 2px 8px rgba(0,0,0,.2)',
};

export const ACTIVE_DOT_PROPS = {
  r: 5,
  strokeWidth: 2,
  fill: CHART_COLORS.tooltipBg,
};
