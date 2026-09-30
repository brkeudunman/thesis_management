import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import StudyForm from "../src/components/StudyForm";
import { inspectImport, importPayload, normalize } from "../src/lib/importSchema";
import { deltaVsParent } from "../src/lib/metrics";
import { studyCreate } from "../src/lib/schemas";
import type { Metric, Study } from "../src/lib/types";

const metric = (value: number, unit: string | null = null): Metric => ({
  id: "metric", name: "latency", value, unit, order: 0,
});
const study = (metrics: Metric[]): Study => ({
  id: "study", title: "Baseline", summary: null, status: "done", notes: "",
  parentId: null, metrics, createdAt: "2026-09-30T00:00:00Z", updatedAt: "2026-09-30T00:00:00Z",
});

test("editable inputs preserve full precision, including very small metrics", () => {
  for (const value of [0.123456789, 123.456789, 0.00000012]) {
    const html = renderToStaticMarkup(createElement(StudyForm, {
      studies: [], initial: study([metric(value)]), defaultParentId: null,
      onCancel() {}, onSaved() {},
    }));
    assert.ok(html.includes(`value="${String(value)}"`), html);
  }
});

test("deltas require matching units", () => {
  assert.equal(deltaVsParent(metric(500, "ms"), study([metric(1, "s")])), null);
  assert.equal(deltaVsParent(metric(500), study([metric(1, "s")])), null);
  assert.equal(deltaVsParent(metric(500, "ms"), study([metric(1000, "ms")]))?.value, -500);
  assert.equal(deltaVsParent(metric(2), study([metric(1)]))?.value, 1);
});

test("import previews reject malformed nodes and invalid metrics without throwing", () => {
  for (const text of [
    "{", "[null]", '[{"title":42}]', '[{"title":"root","children":[null]}]',
    '[{"title":"root","metrics":[{"name":"accuracy","value":"0.9"}]}]', "[]",
  ]) {
    assert.equal(inspectImport(text)?.ok, false, text);
  }
  assert.equal(inspectImport("  "), null);
  assert.deepEqual(inspectImport('{"studies":[{"title":" root ","children":[{"title":"child"}]}]}'), {
    ok: true, roots: ["root"], count: 2,
  });
});

test("imported metrics obey edit limits and accepted imports remain editable", () => {
  for (const metrics of [
    [{ name: "a".repeat(61), value: 1 }],
    [{ name: "accuracy", value: 1, unit: "a".repeat(17) }],
    Array.from({ length: 51 }, (_, i) => ({ name: `metric${i}`, value: i })),
  ]) {
    const raw = [{ title: "root", metrics }];
    assert.equal(inspectImport(JSON.stringify(raw))?.ok, false);
    assert.throws(() => normalize(importPayload.parse(raw)));
  }
  const clean = normalize(importPayload.parse([{ title: "root", metrics: [{ name: " accuracy ", value: 0.123456789 }] }]));
  assert.equal(studyCreate.safeParse(clean[0]).success, true);
  assert.equal(clean[0].metrics[0].value, 0.123456789);
  assert.equal(inspectImport(JSON.stringify(Array.from({ length: 501 }, () => ({ title: "root" }))))?.ok, false);
});

test("study API validation and concurrent reparenting", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "ablation-tests-"));
  const previousUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = `file:${join(directory, "test.db").replaceAll("\\", "/")}`;
  const { prisma } = await import("../src/lib/db");
  try {
    const sql = await readFile(join(process.cwd(), "prisma/migrations/20260829121108_init/migration.sql"), "utf8");
    for (const statement of sql.split(";").filter((part) => part.trim())) {
      await prisma.$executeRawUnsafe(statement);
    }
    const { POST } = await import("../src/app/api/studies/route");
    const { PATCH } = await import("../src/app/api/studies/[id]/route");
    const { POST: importStudies } = await import("../src/app/api/import/route");
    const request = (method: string, payload: unknown) => new Request("http://localhost/api/studies", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const context = (id: string) => ({ params: Promise.resolve({ id }) });
    const create = async (title: string): Promise<Study> => {
      const response = await POST(request("POST", { title }));
      assert.equal(response.status, 201);
      return response.json();
    };

    await t.test("POST and PATCH return 400 for invalid JSON", async () => {
      const root = await create("JSON validation");
      for (const method of ["POST", "PATCH"]) {
        const invalid = new Request("http://localhost/api/studies", { method, body: "{" });
        const response = method === "POST" ? await POST(invalid) : await PATCH(invalid, context(root.id));
        assert.equal(response.status, 400);
        assert.equal((await response.json()).error, "That is not valid JSON.");
      }
    });

    await t.test("concurrent reciprocal moves cannot create a cycle", async () => {
      const a = await create("A");
      const b = await create("B");
      const responses = await Promise.all([
        PATCH(request("PATCH", { parentId: b.id }), context(a.id)),
        PATCH(request("PATCH", { parentId: a.id }), context(b.id)),
      ]);
      assert.deepEqual(responses.map((response) => response.status).sort(), [200, 400]);
      const rows = await prisma.study.findMany({ where: { id: { in: [a.id, b.id] } } });
      assert.equal(rows.filter((row) => row.parentId === null).length, 1);
    });

    await t.test("partial updates preserve parent, status, and metric precision", async () => {
      const parent = await create("parent");
      const response = await POST(request("POST", {
        title: "child", summary: "Original summary", parentId: parent.id, status: "running", metrics: [metric(0.00000012)],
      }));
      const child: Study = await response.json();
      const updated = await PATCH(request("PATCH", { notes: "Changed notes" }), context(child.id));
      assert.equal(updated.status, 200);
      const saved: Study = await updated.json();
      assert.equal(saved.parentId, parent.id);
      assert.equal(saved.status, "running");
      assert.equal(saved.summary, "Original summary");
      assert.equal(saved.metrics[0].value, 0.00000012);
      const cleared = await PATCH(request("PATCH", { metrics: [] }), context(child.id));
      assert.equal(cleared.status, 200);
      assert.deepEqual((await cleared.json()).metrics, []);
    });

    await t.test("invalid replace imports preserve existing studies", async () => {
      const before = await prisma.study.count();
      const response = await importStudies(request("POST", {
        mode: "replace", studies: [{ title: "invalid", metrics: [{ name: "a".repeat(61), value: 1 }] }],
      }));
      assert.equal(response.status, 400);
      assert.equal(await prisma.study.count(), before);
    });
  } finally {
    await prisma.$disconnect();
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
    await rm(directory, { recursive: true, force: true });
  }
});
