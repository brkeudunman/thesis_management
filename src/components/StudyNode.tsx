"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { formatMetric } from "@/lib/metrics";
import { STATUS_COLOR, type Metric } from "@/lib/types";

export type StudyNodePayload = {
  title: string;
  summary: string | null;
  status: string;
  metric: Metric | null;
  metricCount: number;
  childCount: number;
  selected: boolean;
};

export default function StudyNode({ data }: NodeProps) {
  const d = data as unknown as StudyNodePayload;

  return (
    <div
      className={`w-[220px] rounded-lg border bg-panel px-3 py-2 text-left shadow-sm transition-colors ${
        d.selected ? "border-accent ring-2 ring-accent/30" : "border-line"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted !border-0" />

      <div className="flex items-start gap-2">
        <span
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{ background: STATUS_COLOR[d.status] ?? STATUS_COLOR.planned }}
          title={d.status}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold leading-tight">
            {d.title}
          </div>
          {d.summary ? (
            <div className="mt-0.5 truncate text-[11px] text-muted">{d.summary}</div>
          ) : null}
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
            {d.metric ? (
              <span className="font-mono">
                {d.metric.name} {formatMetric(d.metric)}
              </span>
            ) : (
              <span className="italic">no metrics</span>
            )}
            {d.metricCount > 1 ? <span>+{d.metricCount - 1}</span> : null}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-muted !border-0" />
    </div>
  );
}
