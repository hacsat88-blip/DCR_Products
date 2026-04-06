// Professional chart palette
export const CHART_COLORS = {
  mint: '#22C55E',
  blue: '#06B6D4',
  amber: '#F59E0B',
  danger: '#EF4444',
  warmAccent: '#F97316',
  primary: '#4C6EF5',
  violet: '#8B5CF6',
  teal: '#14B8A6',
  grid: 'rgba(148, 163, 184, 0.06)',
  axis: 'rgba(148, 163, 184, 0.5)',
  tooltipBg: '#1E2433',
  tooltipBorder: 'rgba(148, 163, 184, 0.12)',
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
  stroke: CHART_COLORS.primary,
};
