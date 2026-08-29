"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IMPORT_PROMPT } from "@/lib/importSpec";
import type { Study } from "@/lib/types";

type Props = { studies: Study[] };

type Preview =
  | { ok: true; roots: string[]; count: number }
  | { ok: false; message: string }
  | null;

/** Count and outline the tree client-side so mistakes surface before submitting. */
function inspect(text: string): Preview {
  if (!text.trim()) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { ok: false, message: `Not valid JSON — ${(error as Error).message}` };
  }

  const list = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" &&
        parsed !== null &&
        Array.isArray((parsed as { studies?: unknown }).studies)
      ? ((parsed as { studies: unknown[] }).studies as unknown[])
      : null;

  if (!list) {
    return {
      ok: false,
      message: 'Expected an array of studies, or { "studies": [ ... ] }.',
    };
  }
  if (list.length === 0) return { ok: false, message: "No studies in the file." };

  let count = 0;
  const walk = (node: unknown) => {
    count += 1;
    const children = (node as { children?: unknown }).children;
    if (Array.isArray(children)) children.forEach(walk);
  };
  list.forEach(walk);

  return {
    ok: true,
    count,
    roots: list.map(
      (n) => (n as { title?: string }).title?.trim() || "(untitled study)",
    ),
  };
}

export default function ImportPanel({ studies }: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [mode, setMode] = useState<"append" | "replace">("append");
  const [parentId, setParentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const preview = useMemo(() => inspect(text), [text]);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setText(await file.text());
    setError(null);
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(IMPORT_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not reach the clipboard — select the text and copy it manually.");
    }
  }

  async function handleImport() {
    if (!preview?.ok) return;

    if (mode === "replace") {
      const confirmed = window.confirm(
        `Replace everything? This permanently deletes all ${studies.length} existing ${
          studies.length === 1 ? "study" : "studies"
        } and their metrics, then imports ${preview.count}.`,
      );
      if (!confirmed) return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studies: JSON.parse(text),
          mode,
          parentId: mode === "append" ? parentId || null : null,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? "Import failed.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-6 overflow-y-auto px-6 py-8">
      <section>
        <h1 className="text-lg font-semibold">Import studies from JSON</h1>
        <p className="mt-1 text-sm text-muted">
          Open Claude in your ablation repository, paste the prompt below, save what it
          gives you as a <code className="font-mono">.json</code> file, then drop that
          file here.
        </p>
      </section>

      <section className="rounded-lg border border-line bg-panel">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Step 1 — prompt for Claude
          </h2>
          <button
            type="button"
            onClick={copyPrompt}
            className="rounded-md border border-line px-2.5 py-1 text-xs font-medium hover:bg-bg"
          >
            {copied ? "Copied" : "Copy prompt"}
          </button>
        </div>
        <pre className="max-h-56 overflow-auto px-4 py-3 font-mono text-[11px] leading-relaxed text-muted">
          {IMPORT_PROMPT}
        </pre>
      </section>

      <section className="rounded-lg border border-line bg-panel">
        <div className="border-b border-line px-4 py-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Step 2 — the JSON
          </h2>
        </div>
        <div className="space-y-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <label className="cursor-pointer rounded-md border border-line px-3 py-1.5 text-xs font-medium hover:bg-bg">
              Choose .json file
              <input
                type="file"
                accept="application/json,.json"
                onChange={handleFile}
                className="hidden"
              />
            </label>
            <span className="text-xs text-muted">
              {fileName ?? "or paste the JSON below"}
            </span>
          </div>

          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setFileName(null);
              setError(null);
            }}
            rows={12}
            spellCheck={false}
            placeholder='[{ "title": "Baseline", "metrics": [{ "name": "accuracy", "value": 0.871 }], "children": [] }]'
            className="w-full rounded-md border border-line bg-bg px-3 py-2 font-mono text-[12px] leading-relaxed outline-none focus:border-accent"
          />

          {preview ? (
            preview.ok ? (
              <p className="text-xs text-pos">
                {preview.count} {preview.count === 1 ? "study" : "studies"} found —
                roots: {preview.roots.join(", ")}
              </p>
            ) : (
              <p className="text-xs text-neg">{preview.message}</p>
            )
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-panel">
        <div className="border-b border-line px-4 py-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Step 3 — where it goes
          </h2>
        </div>
        <div className="space-y-3 px-4 py-3">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              checked={mode === "append"}
              onChange={() => setMode("append")}
              className="mt-1"
            />
            <span>
              Add to what is already here
              <span className="block text-xs text-muted">
                Existing studies are untouched.
              </span>
            </span>
          </label>

          {mode === "append" && studies.length > 0 ? (
            <label className="ml-6 block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                Attach imported roots under
              </span>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full max-w-sm rounded-md border border-line bg-panel px-2.5 py-1.5 text-sm outline-none focus:border-accent"
              >
                <option value="">nothing — keep them as new roots</option>
                {studies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              checked={mode === "replace"}
              onChange={() => setMode("replace")}
              className="mt-1"
            />
            <span>
              Replace everything
              <span className="block text-xs text-neg">
                Permanently deletes all {studies.length} existing{" "}
                {studies.length === 1 ? "study" : "studies"} first.
              </span>
            </span>
          </label>
        </div>
      </section>

      {error ? (
        <p className="rounded-md border border-neg/40 bg-neg/10 px-3 py-2 text-xs text-neg">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2 pb-4">
        <button
          type="button"
          onClick={handleImport}
          disabled={busy || !preview?.ok}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy
            ? "Importing..."
            : preview?.ok
              ? `Import ${preview.count} ${preview.count === 1 ? "study" : "studies"}`
              : "Import"}
        </button>
        <Link
          href="/"
          className="rounded-md border border-line px-3 py-1.5 text-xs font-medium hover:bg-bg"
        >
          Back to the tree
        </Link>
      </div>
    </div>
  );
}
