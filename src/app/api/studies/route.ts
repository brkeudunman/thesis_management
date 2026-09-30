import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { studyCreate } from "@/lib/schemas";
import { getStudies, serialize, studyInclude } from "@/lib/studies";

export async function GET() {
  return NextResponse.json(await getStudies());
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "That is not valid JSON." }, { status: 400 });
  }
  const parsed = studyCreate.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid study" },
      { status: 400 },
    );
  }
  const { metrics, parentId, ...fields } = parsed.data;

  if (parentId) {
    const parent = await prisma.study.findUnique({ where: { id: parentId } });
    if (!parent) {
      return NextResponse.json({ error: "Parent study not found" }, { status: 400 });
    }
  }

  const created = await prisma.study.create({
    data: {
      ...fields,
      parentId,
      metrics: {
        create: metrics.map((m, order) => ({ ...m, order })),
      },
    },
    include: studyInclude,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return NextResponse.json(serialize(created as any), { status: 201 });
}
