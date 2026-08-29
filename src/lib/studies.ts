import { prisma } from "./db";
import type { Study } from "./types";

const include = { metrics: { orderBy: { order: "asc" as const } } };

type Row = Awaited<ReturnType<typeof prisma.study.findMany>>[number] & {
  metrics: { id: string; name: string; value: number; unit: string | null; order: number }[];
};

export function serialize(row: Row): Study {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    notes: row.notes,
    status: row.status,
    parentId: row.parentId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    metrics: row.metrics.map((m) => ({
      id: m.id,
      name: m.name,
      value: m.value,
      unit: m.unit,
      order: m.order,
    })),
  };
}

/** Every study with its metrics, oldest first. */
export async function getStudies(): Promise<Study[]> {
  const rows = await prisma.study.findMany({
    include,
    orderBy: { createdAt: "asc" },
  });
  return (rows as Row[]).map(serialize);
}

export async function getStudy(id: string): Promise<Study | null> {
  const row = await prisma.study.findUnique({ where: { id }, include });
  return row ? serialize(row as Row) : null;
}

export const studyInclude = include;
