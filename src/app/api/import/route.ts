import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  countNodes,
  importPayload,
  ImportError,
  normalize,
  type CleanNode,
} from "@/lib/importSchema";

const body = z.object({
  studies: importPayload,
  /** "append" keeps what's there, "replace" wipes the database first. */
  mode: z.enum(["append", "replace"]).default("append"),
  /** Imported roots become children of this study. */
  parentId: z.string().nullish(),
});

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "That is not valid JSON." }, { status: 400 });
  }

  const parsed = body.safeParse(payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: issue
          ? `${issue.path.join(".") || "payload"}: ${issue.message}`
          : "The JSON does not match the import format.",
      },
      { status: 400 },
    );
  }

  let clean: CleanNode[];
  try {
    clean = normalize(parsed.data.studies);
  } catch (error) {
    if (error instanceof ImportError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const { mode, parentId } = parsed.data;

  if (mode === "append" && parentId) {
    const parent = await prisma.study.findUnique({ where: { id: parentId } });
    if (!parent) {
      return NextResponse.json({ error: "Parent study not found" }, { status: 400 });
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    if (mode === "replace") {
      // Foreign keys are enforced, so leaves have to go before their parents.
      const rows = await tx.study.findMany({ select: { id: true, parentId: true } });
      const byDepth = new Map<string, number>();
      const depthOf = (id: string, seen = new Set<string>()): number => {
        if (byDepth.has(id)) return byDepth.get(id)!;
        if (seen.has(id)) return 0;
        seen.add(id);
        const parent = rows.find((r) => r.id === id)?.parentId;
        const depth = parent ? depthOf(parent, seen) + 1 : 0;
        byDepth.set(id, depth);
        return depth;
      };
      const ordered = rows
        .map((r) => ({ id: r.id, depth: depthOf(r.id) }))
        .sort((a, b) => b.depth - a.depth);
      for (const row of ordered) {
        await tx.study.delete({ where: { id: row.id } });
      }
    }

    let total = 0;
    const insert = async (node: CleanNode, parent: string | null) => {
      const row = await tx.study.create({
        data: {
          title: node.title,
          summary: node.summary,
          status: node.status,
          notes: node.notes,
          parentId: parent,
          metrics: {
            create: node.metrics.map((m, order) => ({ ...m, order })),
          },
        },
      });
      total += 1;
      for (const child of node.children) {
        await insert(child, row.id);
      }
    };

    const attachTo = mode === "replace" ? null : (parentId ?? null);
    for (const root of clean) {
      await insert(root, attachTo);
    }
    return total;
  });

  return NextResponse.json({ imported: created, expected: countNodes(clean) }, {
    status: 201,
  });
}
