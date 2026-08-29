"use client";

import { deltaVsParent } from "@/lib/metrics";
import type { Metric, Study } from "@/lib/types";

/** Difference against the same metric on the parent study, colored by sign only. */
export default function MetricDelta({
  metric,
  parent,
}: {
  metric: Metric;
  parent: Study | null;
}) {
  const delta = deltaVsParent(metric, parent);
  if (!delta) return <span className="text-muted">—</span>;

  const color =
    delta.sign > 0 ? "text-pos" : delta.sign < 0 ? "text-neg" : "text-muted";
  return <span className={`font-mono ${color}`}>{delta.text}</span>;
}
