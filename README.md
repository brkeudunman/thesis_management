# Ablation Studies

Local app for tracking a thesis's ablation studies as a tree. Graph on the left,
details on the right: metrics table with the delta against the parent study, plus
markdown notes.

## Run it

```bash
npm install          # also runs `prisma generate`
cp .env.example .env # DATABASE_URL="file:./prisma/dev.db"
npx prisma migrate dev
npm run seed         # optional: 3 example studies
npm run dev          # http://localhost:3000
```

## What it does

- **Tree graph** — every study points at the one it builds on. Multiple roots are
  allowed. Layout is computed with dagre, so nodes are never dragged out of place.
- **Detail panel** — click a node for its metrics, the delta vs its parent for every
  metric they share, and its markdown notes.
- **Re-parenting** — change "Builds on" in the edit form to move a whole subtree.
  Moving a study under one of its own descendants is rejected.
- **Careful delete** — a study with children cannot be deleted; the app names the
  studies that block it. Only leaves are deletable, behind a confirm.
- **Export** — `Export .md` writes the whole tree as a nested markdown outline with
  metric tables, ready to paste into the thesis. `Export .json` dumps it nested.
- **Import** — `/import` takes a JSON file of nested studies. It carries a prompt you
  can paste into Claude inside your ablation repository; the JSON that comes back
  imports as-is. Import either adds to the tree (optionally under an existing study)
  or replaces everything, behind a confirm. `Export .json` round-trips through it.

## Layout

| Path | Purpose |
| --- | --- |
| `prisma/schema.prisma` | `Study` (self-relation tree) and `Metric` |
| `prisma/seed.ts` | example baseline + two ablations |
| `src/lib/tree.ts` | forest building, subtree collection (cycle guard) |
| `src/lib/metrics.ts` | value formatting, delta vs parent |
| `src/lib/export.ts` | markdown / JSON serialisation |
| `src/lib/importSchema.ts` | lenient JSON parsing and validation for imports |
| `src/lib/importSpec.ts` | the prompt handed to Claude to produce that JSON |
| `src/app/api/studies` | REST: list, create, read, update, delete |
| `src/components/StudyGraph.tsx` | React Flow canvas + dagre layout |
| `src/components/DetailPanel.tsx` | right-hand panel |
| `src/components/StudyForm.tsx` | create / edit form |
| `src/components/ImportPanel.tsx` | the `/import` page |

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm run seed       # seed example data (skips if any study exists)
npm run db:studio  # Prisma Studio, to inspect the SQLite file
npm run lint
```

The database is a single file at `prisma/dev.db` — back it up by copying it.
