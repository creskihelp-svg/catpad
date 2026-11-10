/** Formatting helpers shared across the UI. */

export const shortAddress = (value?: string, edge = 4) => {
  if (!value) return '';
  if (value.length <= edge * 2 + 3) return value;
  return `${value.slice(0, edge)}...${value.slice(-edge)}`;
};

export const formatSol = (value: number | string, digits = 2) =>
  `${Number(value || 0).toFixed(digits)} SOL`;

export const formatPercent = (bps: number) => `${(Number(bps) / 100).toFixed(0)}%`;

/** Only render aggregates once there is real data behind them. */
export const hasValue = (value: number | null | undefined) => Number(value) > 0;

export const classNames = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');
