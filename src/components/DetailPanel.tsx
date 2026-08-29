"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MetricDelta from "./MetricDelta";
import { formatValue } from "@/lib/metrics";
import { STATUS_COLOR, type Study } from "@/lib/types";

type Props = {
  study: Study;
  parent: Study | null;
  childStudies: Study[];
  ancestors: Study[];
  busy: boolean;
  error: string | null;
  onSelect: (id: string) => void;
  onEdit: () => void;
  onAddChild: () => void;
  onDelete: () => void;
};

export default function DetailPanel({
  study,
  parent,
  childStudies,
  ancestors,
  busy,
  error,
  onSelect,
  onEdit,
  onAddChild,
  onDelete,
}: Props) {
  const blocked = childStudies.length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-5 py-4">
        {ancestors.length > 0 ? (
          <nav className="mb-2 flex flex-wrap items-center gap-1 text-[11px] text-muted">
            {ancestors.map((a) => (
              <span key={a.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSelect(a.id)}
                  className="hover:text-accent hover:underline"
                >
                  {a.title}
                </button>
                <span>/</span>
              </span>
            ))}
          </nav>
        ) : null}

        <div className="flex items-start gap-2">
          <span
            className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: STATUS_COLOR[study.status] ?? STATUS_COLOR.planned }}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold leading-tight">{study.title}</h1>
            {study.summary ? (
              <p className="mt-1 text-sm text-muted">{study.summary}</p>
            ) : null}
            <p className="mt-1 text-[11px] uppercase tracking-wide text-muted">
              {study.status}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-medium hover:bg-bg"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onAddChild}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
          >
            Add child study
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy || blocked}
            title={
              blocked
                ? `Cannot delete — ${childStudies.length} ${
                    childStudies.length === 1 ? "study builds" : "studies build"
                  } on this one`
                : undefined
            }
            className="rounded-md border border-line px-3 py-1.5 text-xs font-medium text-neg hover:bg-bg disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete
          </button>
        </div>

        {error ? (
          <p className="mt-3 rounded-md border border-neg/40 bg-neg/10 px-3 py-2 text-xs text-neg">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Results
          </h2>
          {study.metrics.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              No metrics recorded. Use Edit to add some.
            </p>
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                    <th className="py-1.5 pr-3 font-medium">Metric</th>
                    <th className="py-1.5 pr-3 font-medium">Value</th>
                    <th className="py-1.5 font-medium">
                      {parent ? `Δ vs ${parent.title}` : "Δ vs parent"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {study.metrics.map((m) => (
                    <tr key={m.id} className="border-b border-line/60">
                      <td className="py-1.5 pr-3">{m.name}</td>
                      <td className="py-1.5 pr-3 font-mono">
                        {formatValue(m.value)}
                        {m.unit ? (
                          <span className="ml-1 text-muted">{m.unit}</span>
                        ) : null}
                      </td>
                      <td className="py-1.5">
                        <MetricDelta metric={m} parent={parent} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Notes
          </h2>
          {study.notes.trim() ? (
            <div className="markdown mt-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{study.notes}</ReactMarkdown>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">No notes yet.</p>
          )}
        </section>

        {childStudies.length > 0 ? (
          <section className="mt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Builds on this ({childStudies.length})
            </h2>
            <ul className="mt-2 space-y-1">
              {childStudies.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className="text-sm text-accent hover:underline"
                  >
                    {c.title}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="mt-8 text-[11px] text-muted">
          Updated {new Date(study.updatedAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
