"use client";

import { useCallback, useMemo, useState } from "react";
import DetailPanel from "./DetailPanel";
import StudyForm from "./StudyForm";
import StudyGraph from "./StudyGraph";
import { ancestorPath } from "@/lib/tree";
import type { Study } from "@/lib/types";

type Mode =
  | { kind: "view" }
  | { kind: "edit"; id: string }
  | { kind: "create"; parentId: string | null };

export default function Workspace({ initialStudies }: { initialStudies: Study[] }) {
  const [studies, setStudies] = useState(initialStudies);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialStudies[0]?.id ?? null,
  );
  const [mode, setMode] = useState<Mode>({ kind: "view" });
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const byId = useMemo(() => new Map(studies.map((s) => [s.id, s])), [studies]);
  const selected = selectedId ? (byId.get(selectedId) ?? null) : null;
  const parent = selected?.parentId ? (byId.get(selected.parentId) ?? null) : null;
  const childStudies = useMemo(
    () => (selected ? studies.filter((s) => s.parentId === selected.id) : []),
    [studies, selected],
  );
  const ancestors = useMemo(
    () => (selected ? ancestorPath(studies, selected.id).slice(0, -1) : []),
    [studies, selected],
  );

  const refresh = useCallback(async () => {
    const response = await fetch("/api/studies");
    if (response.ok) setStudies((await response.json()) as Study[]);
  }, []);

  const select = useCallback((id: string) => {
    setSelectedId(id);
    setMode({ kind: "view" });
    setDeleteError(null);
  }, []);

  async function handleDelete() {
    if (!selected) return;
    if (
      !window.confirm(
        `Delete "${selected.title}"? This cannot be undone.`,
      )
    ) {
      return;
    }

    setBusy(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/studies/${selected.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = await response.json();
        setDeleteError(
          body.childTitles?.length
            ? `${body.error} (${body.childTitles.join(", ")})`
            : (body.error ?? "Could not delete the study."),
        );
        return;
      }
      const nextId = selected.parentId ?? null;
      await refresh();
      setSelectedId(nextId);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaved(saved: Study) {
    await refresh();
    setSelectedId(saved.id);
    setMode({ kind: "view" });
  }

  return (
    <main className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line bg-panel px-5 py-3">
        <div>
          <h1 className="text-sm font-semibold">Ablation studies</h1>
          <p className="text-[11px] text-muted">
            {studies.length} {studies.length === 1 ? "study" : "studies"} — click a node
            to see its results
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode({ kind: "create", parentId: null })}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-medium hover:bg-bg"
          >
            New root study
          </button>
          <a
            href="/api/export?format=md"
            className="rounded-md border border-line px-3 py-1.5 text-xs font-medium hover:bg-bg"
          >
            Export .md
          </a>
          <a
            href="/api/export?format=json"
            className="rounded-md border border-line px-3 py-1.5 text-xs font-medium hover:bg-bg"
          >
            Export .json
          </a>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="min-w-0 flex-1 border-r border-line">
          <StudyGraph studies={studies} selectedId={selectedId} onSelect={select} />
        </section>

        <aside className="w-[420px] shrink-0 overflow-hidden bg-panel">
          {mode.kind === "create" ? (
            <StudyForm
              studies={studies}
              initial={null}
              defaultParentId={mode.parentId}
              onCancel={() => setMode({ kind: "view" })}
              onSaved={handleSaved}
            />
          ) : mode.kind === "edit" && selected ? (
            <StudyForm
              studies={studies}
              initial={selected}
              defaultParentId={selected.parentId}
              onCancel={() => setMode({ kind: "view" })}
              onSaved={handleSaved}
            />
          ) : selected ? (
            <DetailPanel
              study={selected}
              parent={parent}
              childStudies={childStudies}
              ancestors={ancestors}
              busy={busy}
              error={deleteError}
              onSelect={select}
              onEdit={() => setMode({ kind: "edit", id: selected.id })}
              onAddChild={() => setMode({ kind: "create", parentId: selected.id })}
              onDelete={handleDelete}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
              <p className="text-sm text-muted">
                {studies.length === 0
                  ? "No studies yet."
                  : "Select a study in the graph."}
              </p>
              <button
                type="button"
                onClick={() => setMode({ kind: "create", parentId: null })}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
              >
                New root study
              </button>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
