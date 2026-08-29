import type { Study, StudyNodeData } from "./types";

/** Build the forest (multiple roots allowed) from a flat list, sorted by creation order. */
export function buildForest(studies: Study[]): StudyNodeData[] {
  const byId = new Map<string, StudyNodeData>();
  for (const s of studies) {
    byId.set(s.id, { ...s, depth: 0, children: [] });
  }

  const roots: StudyNodeData[] = [];
  for (const s of studies) {
    const node = byId.get(s.id)!;
    const parent = s.parentId ? byId.get(s.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const setDepth = (node: StudyNodeData, depth: number) => {
    node.depth = depth;
    node.children.sort(byCreated);
    for (const c of node.children) setDepth(c, depth + 1);
  };
  roots.sort(byCreated);
  for (const r of roots) setDepth(r, 0);

  return roots;
}

function byCreated(a: Study, b: Study) {
  return a.createdAt.localeCompare(b.createdAt);
}

/** Depth-first walk, parents before children. */
export function flatten(forest: StudyNodeData[]): StudyNodeData[] {
  const out: StudyNodeData[] = [];
  const visit = (n: StudyNodeData) => {
    out.push(n);
    n.children.forEach(visit);
  };
  forest.forEach(visit);
  return out;
}

/**
 * Ids of `rootId` and everything beneath it. A study may not be re-parented
 * onto any of these — that would create a cycle.
 */
export function collectSubtreeIds(
  studies: Pick<Study, "id" | "parentId">[],
  rootId: string,
): Set<string> {
  const childrenOf = new Map<string | null, string[]>();
  for (const s of studies) {
    const list = childrenOf.get(s.parentId) ?? [];
    list.push(s.id);
    childrenOf.set(s.parentId, list);
  }

  const ids = new Set<string>();
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    if (ids.has(id)) continue;
    ids.add(id);
    stack.push(...(childrenOf.get(id) ?? []));
  }
  return ids;
}

/** Chain from root down to (and including) the given study. */
export function ancestorPath(studies: Study[], id: string): Study[] {
  const byId = new Map(studies.map((s) => [s.id, s]));
  const path: Study[] = [];
  let current = byId.get(id);
  const seen = new Set<string>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}
