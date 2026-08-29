import { z } from "zod";
import { STATUSES, type Status } from "./types";

/** Loose shape: anything Claude reasonably emits should parse. */
export type RawNode = {
  title: string;
  summary?: string | null;
  status?: string | null;
  notes?: string | null;
  metrics?: { name: string; value: unknown; unit?: string | null }[] | null;
  children?: RawNode[] | null;
};

const rawNode: z.ZodType<RawNode> = z.lazy(() =>
  z.object({
    title: z.string(),
    summary: z.string().nullish(),
    status: z.string().nullish(),
    notes: z.string().nullish(),
    metrics: z
      .array(
        z.object({
          name: z.string(),
          // Checked in normalize() so the error can name the offending metric.
          value: z.unknown(),
          unit: z.string().nullish(),
        }),
      )
      .nullish(),
    children: z.array(rawNode).nullish(),
  }),
);

/** Accepts a bare array or `{ "studies": [...] }`. */
export const importPayload = z.union([
  z.array(rawNode),
  z.object({ studies: z.array(rawNode) }).transform((v) => v.studies),
]);

export type CleanNode = {
  title: string;
  summary: string | null;
  status: Status;
  notes: string;
  metrics: { name: string; value: number; unit: string | null }[];
  children: CleanNode[];
};

export const MAX_IMPORT_NODES = 500;

export class ImportError extends Error {}

/** Trim, clamp, and reject anything the database would refuse. */
export function normalize(nodes: RawNode[]): CleanNode[] {
  let count = 0;

  const visit = (node: RawNode, path: string): CleanNode => {
    count += 1;
    if (count > MAX_IMPORT_NODES) {
      throw new ImportError(
        `Too many studies in one import (limit ${MAX_IMPORT_NODES}).`,
      );
    }

    const title = (node.title ?? "").trim();
    if (!title) {
      throw new ImportError(
        path
          ? `A study under "${path}" has no title.`
          : "A top-level study has no title.",
      );
    }
    const where = path ? `${path} / ${title}` : title;

    const status = (node.status ?? "").trim().toLowerCase();

    const metrics = (node.metrics ?? []).map((m) => {
      const name = (m.name ?? "").trim();
      if (!name) throw new ImportError(`A metric in "${where}" has no name.`);
      if (typeof m.value !== "number" || !Number.isFinite(m.value)) {
        throw new ImportError(
          `Metric "${name}" in "${where}" needs a finite number, got ${JSON.stringify(
            m.value,
          )}.`,
        );
      }
      return { name, value: m.value, unit: (m.unit ?? "").trim() || null };
    });

    return {
      title: title.slice(0, 200),
      summary: (node.summary ?? "").trim().slice(0, 300) || null,
      status: (STATUSES as readonly string[]).includes(status)
        ? (status as Status)
        : "done",
      notes: (node.notes ?? "").slice(0, 50_000),
      metrics,
      children: (node.children ?? []).map((c) => visit(c, where)),
    };
  };

  const clean = nodes.map((n) => visit(n, ""));
  if (clean.length === 0) {
    throw new ImportError("The file contains no studies.");
  }
  return clean;
}

export function countNodes(nodes: CleanNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countNodes(n.children), 0);
}
