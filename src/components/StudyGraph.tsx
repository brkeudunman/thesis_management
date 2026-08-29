"use client";

import { useMemo } from "react";
import { Graph, layout } from "@dagrejs/dagre";
import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import StudyNode, { type StudyNodePayload } from "./StudyNode";
import type { Study } from "@/lib/types";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 78;

const nodeTypes = { study: StudyNode };

type Props = {
  studies: Study[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/** Top-down dagre layout, recomputed whenever the studies change. */
function layoutGraph(studies: Study[], selectedId: string | null) {
  const g = new Graph();
  g.setGraph({ rankdir: "TB", ranksep: 80, nodesep: 40, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));

  const ids = new Set(studies.map((s) => s.id));
  const childCount = new Map<string, number>();

  for (const s of studies) {
    g.setNode(s.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const s of studies) {
    if (s.parentId && ids.has(s.parentId)) {
      g.setEdge(s.parentId, s.id);
      childCount.set(s.parentId, (childCount.get(s.parentId) ?? 0) + 1);
    }
  }

  layout(g);

  const nodes: Node[] = studies.map((s) => {
    const pos = g.node(s.id);
    const payload: StudyNodePayload = {
      title: s.title,
      summary: s.summary,
      status: s.status,
      metric: s.metrics[0] ?? null,
      metricCount: s.metrics.length,
      childCount: childCount.get(s.id) ?? 0,
      selected: s.id === selectedId,
    };
    return {
      id: s.id,
      type: "study",
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: payload as unknown as Record<string, unknown>,
    } as Node;
  });

  const edges: Edge[] = studies
    .filter((s) => s.parentId && ids.has(s.parentId))
    .map((s) => ({
      id: `${s.parentId}->${s.id}`,
      source: s.parentId!,
      target: s.id,
      type: "smoothstep",
      style: { stroke: "var(--line)", strokeWidth: 2 },
    }));

  return { nodes, edges };
}

export default function StudyGraph({ studies, selectedId, onSelect }: Props) {
  const { nodes, edges } = useMemo(
    () => layoutGraph(studies, selectedId),
    [studies, selectedId],
  );

  if (studies.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted">
        No studies yet. Use <span className="mx-1 font-medium">New root study</span> to
        add the first one.
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => onSelect(node.id)}
      nodesDraggable={false}
      nodesConnectable={false}
      edgesFocusable={false}
      fitView
      fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
      className="bg-bg"
    >
      <Background gap={20} size={1} color="var(--line)" />
      <Controls showInteractive={false} className="!shadow-none" />
    </ReactFlow>
  );
}
