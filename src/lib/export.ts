import { deltaVsParent, formatValue } from "./metrics";
import type { Study, StudyNodeData } from "./types";

/** Whole forest as a nested markdown outline, one section per study. */
export function toMarkdown(forest: StudyNodeData[], all: Study[]): string {
  const byId = new Map(all.map((s) => [s.id, s]));
  const lines: string[] = ["# Ablation studies", ""];

  const visit = (node: StudyNodeData) => {
    const level = Math.min(node.depth + 2, 6);
    lines.push(`${"#".repeat(level)} ${node.title}`, "");

    const meta = [`status: ${node.status}`];
    if (node.summary) meta.push(node.summary);
    lines.push(`_${meta.join(" — ")}_`, "");

    if (node.metrics.length) {
      const parent = node.parentId ? byId.get(node.parentId) : null;
      const withDelta = node.metrics.some((m) => deltaVsParent(m, parent));

      lines.push(
        withDelta ? "| Metric | Value | Δ vs parent |" : "| Metric | Value |",
        withDelta ? "| --- | --- | --- |" : "| --- | --- |",
      );
      for (const m of node.metrics) {
        const value = m.unit
          ? `${formatValue(m.value)} ${m.unit}`
          : formatValue(m.value);
        const delta = deltaVsParent(m, parent);
        lines.push(
          withDelta
            ? `| ${m.name} | ${value} | ${delta ? delta.text : "—"} |`
            : `| ${m.name} | ${value} |`,
        );
      }
      lines.push("");
    }

    if (node.notes.trim()) {
      lines.push(node.notes.trim(), "");
    }

    node.children.forEach(visit);
  };

  forest.forEach(visit);
  return lines.join("\n");
}

/** Whole forest as nested JSON, children inline. */
export function toJson(forest: StudyNodeData[]): string {
  const strip = (node: StudyNodeData): unknown => ({
    id: node.id,
    title: node.title,
    summary: node.summary,
    status: node.status,
    notes: node.notes,
    metrics: node.metrics.map((m) => ({
      name: m.name,
      value: m.value,
      unit: m.unit,
    })),
    children: node.children.map(strip),
  });
  return JSON.stringify(forest.map(strip), null, 2);
}
