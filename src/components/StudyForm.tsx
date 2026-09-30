"use client";

import { useMemo, useState } from "react";
import { collectSubtreeIds } from "@/lib/tree";
import { STATUSES, type Study } from "@/lib/types";

type MetricRow = { name: string; value: string; unit: string };

type Props = {
  studies: Study[];
  /** null → creating a new study */
  initial: Study | null;
  defaultParentId: string | null;
  onCancel: () => void;
  onSaved: (study: Study) => void;
};

const emptyRow: MetricRow = { name: "", value: "", unit: "" };

export default function StudyForm({
  studies,
  initial,
  defaultParentId,
  onCancel,
  onSaved,
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [status, setStatus] = useState(initial?.status ?? "done");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [parentId, setParentId] = useState<string>(
    initial ? (initial.parentId ?? "") : (defaultParentId ?? ""),
  );
  const [rows, setRows] = useState<MetricRow[]>(
    initial && initial.metrics.length
      ? initial.metrics.map((m) => ({
          name: m.name,
          value: String(m.value),
          unit: m.unit ?? "",
        }))
      : [{ ...emptyRow }],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // A study may not be moved under itself or any of its descendants.
  const parentOptions = useMemo(() => {
    const blocked = initial
      ? collectSubtreeIds(studies, initial.id)
      : new Set<string>();
    return studies.filter((s) => !blocked.has(s.id));
  }, [studies, initial]);

  const setRow = (index: number, patch: Partial<MetricRow>) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    const metrics: { name: string; value: number; unit: string | null }[] = [];
    for (const row of rows) {
      const name = row.name.trim();
      const raw = row.value.trim();
      if (!name && !raw) continue; // blank row, ignore
      if (!name) {
        setError("A metric row is missing its name.");
        return;
      }
      const value = Number(raw);
      if (raw === "" || !Number.isFinite(value)) {
        setError(`Metric "${name}" needs a numeric value.`);
        return;
      }
      metrics.push({ name, value, unit: row.unit.trim() || null });
    }

    setSaving(true);
    try {
      const response = await fetch(
        initial ? `/api/studies/${initial.id}` : "/api/studies",
        {
          method: initial ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            summary: summary.trim() || null,
            status,
            notes,
            parentId: parentId || null,
            metrics,
          }),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Could not save the study.");
        return;
      }
      onSaved(body as Study);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      <div className="border-b border-line px-5 py-4">
        <h1 className="text-lg font-semibold">
          {initial ? "Edit study" : "New study"}
        </h1>
        <p className="mt-1 text-xs text-muted">
          {initial
            ? "Metrics are replaced with whatever you leave here."
            : "Pick the study this one builds on, or leave the parent empty for a new root."}
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <Field label="Title">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="no cross-attention"
            autoFocus
            className={inputClass}
          />
        </Field>

        <Field label="One-line summary">
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Remove cross-attention block"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Builds on">
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className={inputClass}
            >
              <option value="">none (root study)</option>
              {parentOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={inputClass}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              Metrics
            </span>
            <button
              type="button"
              onClick={() => setRows((prev) => [...prev, { ...emptyRow }])}
              className="text-xs font-medium text-accent hover:underline"
            >
              + Add metric
            </button>
          </div>

          <div className="mt-2 space-y-2">
            {rows.map((row, index) => (
              <div key={index} className="flex gap-2">
                <input
                  value={row.name}
                  onChange={(e) => setRow(index, { name: e.target.value })}
                  placeholder="accuracy"
                  className={`${inputClass} flex-1`}
                />
                <input
                  value={row.value}
                  onChange={(e) => setRow(index, { value: e.target.value })}
                  placeholder="0.871"
                  inputMode="decimal"
                  className={`${inputClass} w-28 font-mono`}
                />
                <input
                  value={row.unit}
                  onChange={(e) => setRow(index, { unit: e.target.value })}
                  placeholder="unit"
                  className={`${inputClass} w-20`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setRows((prev) =>
                      prev.length === 1
                        ? [{ ...emptyRow }]
                        : prev.filter((_, i) => i !== index),
                    )
                  }
                  aria-label="Remove metric"
                  className="rounded-md border border-line px-2 text-muted hover:bg-bg"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        </div>

        <Field label="Notes (markdown)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={12}
            placeholder={"## Setup\n\n- lr 3e-4, 12 epochs\n\n**Finding:** ..."}
            className={`${inputClass} font-mono text-[12px] leading-relaxed`}
          />
        </Field>
      </div>

      <div className="border-t border-line px-5 py-3">
        {error ? (
          <p className="mb-2 rounded-md border border-neg/40 bg-neg/10 px-3 py-2 text-xs text-neg">
            {error}
          </p>
        ) : null}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : initial ? "Save changes" : "Create study"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-medium hover:bg-bg"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-md border border-line bg-panel px-2.5 py-1.5 text-sm outline-none focus:border-accent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
