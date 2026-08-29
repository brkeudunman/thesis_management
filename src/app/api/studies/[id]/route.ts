import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { studyUpdate } from "@/lib/schemas";
import { collectSubtreeIds } from "@/lib/tree";
import { getStudy, serialize, studyInclude } from "@/lib/studies";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const study = await getStudy(id);
  if (!study) {
    return NextResponse.json({ error: "Study not found" }, { status: 404 });
  }
  return NextResponse.json(study);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;

  const existing = await prisma.study.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Study not found" }, { status: 404 });
  }

  const parsed = studyUpdate.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid study" },
      { status: 400 },
    );
  }
  const { metrics, parentId, ...fields } = parsed.data;
  const reparenting = "parentId" in parsed.data;

  if (reparenting && parentId) {
    if (parentId === id) {
      return NextResponse.json(
        { error: "A study cannot be its own parent." },
        { status: 400 },
      );
    }
    const all = await prisma.study.findMany({ select: { id: true, parentId: true } });
    if (!all.some((s) => s.id === parentId)) {
      return NextResponse.json({ error: "Parent study not found" }, { status: 400 });
    }
    if (collectSubtreeIds(all, id).has(parentId)) {
      return NextResponse.json(
        { error: "That study builds on this one — moving it there would create a loop." },
        { status: 400 },
      );
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (metrics) {
      await tx.metric.deleteMany({ where: { studyId: id } });
      await tx.metric.createMany({
        data: metrics.map((m, order) => ({ ...m, order, studyId: id })),
      });
    }
    return tx.study.update({
      where: { id },
      data: { ...fields, ...(reparenting ? { parentId } : {}) },
      include: studyInclude,
    });
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json(serialize(updated as any));
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;

  const existing = await prisma.study.findUnique({
    where: { id },
    include: { children: { select: { id: true, title: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Study not found" }, { status: 404 });
  }

  if (existing.children.length > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete "${existing.title}" — ${existing.children.length} ${
          existing.children.length === 1 ? "study builds" : "studies build"
        } on it.`,
        childCount: existing.children.length,
        childTitles: existing.children.map((c) => c.title),
      },
      { status: 409 },
    );
  }

  await prisma.study.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
