import type { Metric, Study } from "./types";

/** Trim float noise without losing precision on small values. */
export function formatValue(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  if (Number.isInteger(value)) return String(value);
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 2 : abs >= 1 ? 4 : 6;
  return String(Number(value.toFixed(digits)));
}

export function formatMetric(metric: Metric): string {
  return metric.unit
    ? `${formatValue(metric.value)} ${metric.unit}`
    : formatValue(metric.value);
}

export type Delta = { value: number; text: string; sign: -1 | 0 | 1 };

/** Difference against the same-named metric with matching units on the parent. */
export function deltaVsParent(
  metric: Metric,
  parent: Study | null | undefined,
): Delta | null {
  if (!parent) return null;
  const match = parent.metrics.find(
    (m) => m.name === metric.name && m.unit === metric.unit,
  );
  if (!match) return null;

  const value = metric.value - match.value;
  const rounded = Number(formatValue(value));
  const sign = rounded > 0 ? 1 : rounded < 0 ? -1 : 0;
  const text = `${sign > 0 ? "+" : ""}${formatValue(value)}`;
  return { value, text, sign };
}
