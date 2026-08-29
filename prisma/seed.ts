import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  }),
});

async function main() {
  const count = await prisma.study.count();
  if (count > 0) {
    console.log(`Skipping seed — ${count} studies already exist.`);
    return;
  }

  const baseline = await prisma.study.create({
    data: {
      title: "Baseline",
      summary: "Full model, no ablations",
      status: "done",
      notes: [
        "## Setup",
        "",
        "- 4x A100, 12 epochs, lr `3e-4`, batch 64",
        "- Dataset: full training split, no augmentation changes",
        "",
        "Reference point for every ablation below.",
      ].join("\n"),
      metrics: {
        create: [
          { name: "accuracy", value: 0.871, order: 0 },
          { name: "f1", value: 0.848, order: 1 },
          { name: "params", value: 124, unit: "M", order: 2 },
        ],
      },
    },
  });

  await prisma.study.create({
    data: {
      title: "− cross-attention",
      summary: "Remove cross-attention block",
      status: "done",
      parentId: baseline.id,
      notes: [
        "Dropped the cross-attention block from every decoder layer.",
        "",
        "**Finding:** accuracy falls ~3 points while params drop 18M, so the block",
        "is doing real work rather than adding capacity for its own sake.",
      ].join("\n"),
      metrics: {
        create: [
          { name: "accuracy", value: 0.842, order: 0 },
          { name: "f1", value: 0.815, order: 1 },
          { name: "params", value: 106, unit: "M", order: 2 },
        ],
      },
    },
  });

  await prisma.study.create({
    data: {
      title: "+ augmentation",
      summary: "Add RandAugment on top of baseline",
      status: "done",
      parentId: baseline.id,
      notes: [
        "RandAugment (`n=2, m=9`) applied to the training split only.",
        "",
        "**Finding:** best single change so far. Next branch should stack this",
        "with the longer schedule.",
      ].join("\n"),
      metrics: {
        create: [
          { name: "accuracy", value: 0.893, order: 0 },
          { name: "f1", value: 0.877, order: 1 },
          { name: "params", value: 124, unit: "M", order: 2 },
        ],
      },
    },
  });

  console.log("Seeded 3 studies.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
