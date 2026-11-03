"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultAcademicYear } from "@/config/sources";
import { CONCERNS, INTEREST_LABELS, LEAD_SOURCES, NEXT_STEPS } from "@/lib/constants";
import { rowInYear, yearOptions } from "@/lib/office/year";
import type { OfficeRow, OfficeSnapshot, OfficeTabId } from "@/lib/office/types";
import { downloadPdf, downloadPng } from "@/tabs/tours/export-chart";
import { OfficeChartWindow } from "@/tabs/office/OfficeChartWindow";

type NotesDraft = {
  gradeOfInterest: string;
  leadSource: string;
  interestLevel: number;
  concerns: string[];
  nextStep: string;
  comment: string;
};

function notesKey(id: string) {
  return `risr.officeNotes.${id}`;
}

export function OfficeScreen({ tab }: { tab: OfficeTabId }) {
  const [snapshot, setSnapshot] = useState<OfficeSnapshot | null>(null);
  const [error, setError] = useState("");
  const [year, setYear] = useState(defaultAcademicYear);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ column: string; dir: "asc" | "desc" } | null>(null);
  const [selected, setSelected] = useState<OfficeRow | null>(null);
  const [chartId, setChartId] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/office", { cache: "no-store" });
    const payload = (await response.json()) as OfficeSnapshot & { error?: string };
    if (!response.ok) throw new Error(payload.error || "Could not load this tab.");
    setSnapshot(payload);
  }

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("log") === "1") setLogOpen(true);
    load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load this tab."));
  }, []);

  const payload = snapshot?.tabs[tab];
  const rows = useMemo(() => {
    const list = (payload?.rows ?? []).filter((item) => rowInYear(item, year, tab));
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? list.filter((item) => Object.values(item.cells).join(" ").toLowerCase().includes(needle) || item.badges.join(" ").toLowerCase().includes(needle))
      : list;
    if (!sort) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const left = a.cells[sort.column] ?? "";
      const right = b.cells[sort.column] ?? "";
      const compared = left.localeCompare(right, undefined, { numeric: true });
      return sort.dir === "asc" ? compared : -compared;
    });
    return copy;
  }, [payload, year, query, sort, tab]);

  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/office/refresh", { method: "POST" });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Refresh failed.");
      await load();
      setLogOpen(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Refresh failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!payload) {
    return <p className="text-sm text-[#3e556c]">{error || "Loading…"}</p>;
  }

  const chart = payload.charts.find((item) => item.id === chartId) ?? null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-title text-5xl leading-none text-navy-900">{payload.title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-[#3e556c]">
            {snapshot?.mock ? "Fictional sample data. Live OpenApply, Notion, and Google sources are read-only and are not connected." : "Reading the latest snapshot."}
            {payload.note ? ` ${payload.note}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded border border-[#d5dee8] bg-white px-3 py-2 text-sm font-semibold" onClick={() => setLogOpen(true)}>
            Sync log
          </button>
          <button type="button" className="rounded bg-navy-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60" onClick={refresh} disabled={busy}>
            {busy ? "Refreshing…" : "Refresh now"}
          </button>
        </div>
      </div>
      {error ? <p className="mb-3 text-sm text-[#8d2f2f]">{error}</p> : null}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {payload.kpis.map((kpi) => (
          <button key={kpi.id} type="button" className="rounded-lg border border-[#d5dee8] bg-white px-4 py-3 text-left" onClick={() => setChartId(kpi.chartId)}>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5c7388]">{kpi.label}</p>
            <p className="font-title text-4xl leading-none text-navy-900">{kpi.value}</p>
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="text-sm">
          Year
          <select className="ml-2 rounded border border-[#d5dee8] bg-white px-2 py-1" value={year} onChange={(event) => setYear(event.target.value)}>
            {yearOptions.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "All years" : option}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Search
          <input className="ml-2 rounded border border-[#d5dee8] px-2 py-1" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, grade, status" />
        </label>
      </div>
      {payload.reconciliation ? (
        <div className="mb-4 rounded-lg border border-[#d5dee8] bg-white px-4 py-3">
          <h2 className="font-heading text-xl text-navy-900">Reconciliation</h2>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            {payload.reconciliation.map((item) => (
              <p key={item.label}>
                <span className="font-semibold">{item.label}:</span> {item.count}
              </p>
            ))}
          </div>
          {payload.mismatches && payload.mismatches.length > 0 ? (
            <ul className="mt-2 list-disc pl-5 text-sm text-[#3e556c]">
              {payload.mismatches.map((item) => (
                <li key={`${item.name}-${item.issue}`}>
                  {item.name}: {item.issue}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <section className="mb-4 rounded-lg border border-[#d5dee8] bg-white px-4 py-3">
        <h2 className="font-heading text-xl text-navy-900">Data quality</h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-[#3e556c]">
          {payload.gaps.map((gap) => (
            <li key={gap.label}>
              <span className="font-semibold text-[#142033]">{gap.label}.</span> {gap.detail}
            </li>
          ))}
        </ul>
      </section>
      <div className="overflow-x-auto rounded-lg border border-[#d5dee8] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#f7fafc] text-xs uppercase tracking-wide text-[#5c7388]">
            <tr>
              {payload.columns.map((column) => (
                <th key={column} className="px-3 py-2 font-semibold">
                  <button
                    type="button"
                    className="uppercase"
                    onClick={() => setSort((current) => ({ column, dir: current?.column === column && current.dir === "asc" ? "desc" : "asc" }))}
                  >
                    {column}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="cursor-pointer border-t border-[#d5dee8] hover:bg-[#f7fafc]" onClick={() => setSelected(item)}>
                {payload.columns.map((column) => (
                  <td key={column} className="px-3 py-2">
                    {column === "Name" || column === payload.columns[0] ? (
                      <span className="font-semibold text-navy-900">{item.cells[column] || "—"}</span>
                    ) : (
                      item.cells[column] || "—"
                    )}
                    {column === "Name"
                      ? item.badges.map((badge) => (
                          <span key={badge} className="ml-2 rounded-full bg-[#e7edf5] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-navy-900">
                            {badge}
                          </span>
                        ))
                      : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-[#5c7388]">{rows.length} rows</p>
      {selected ? <RecordNotesPanel row={selected} onClose={() => setSelected(null)} /> : null}
      {chart ? <OfficeChartWindow chart={chart} onClose={() => setChartId(null)} /> : null}
      {logOpen && snapshot ? (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-[#142033]/40 p-6" onClick={() => setLogOpen(false)}>
          <div className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-5" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-title text-4xl text-navy-900">Sync log</h2>
              <button type="button" className="text-sm font-semibold" onClick={() => setLogOpen(false)}>
                Close
              </button>
            </div>
            <p className="mt-1 text-sm text-[#3e556c]">Weekday refresh is 05:55 Asia/Bangkok. Source systems are read-only. Writes go to the master sheet only.</p>
            <table className="mt-3 w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-[#5c7388]">
                  <th className="py-2">At</th>
                  <th>Scope</th>
                  <th>Rows</th>
                  <th>Mode</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.syncLog.map((entry) => (
                  <tr key={`${entry.at}-${entry.scope}`} className="border-t border-[#d5dee8]">
                    <td className="py-2 pr-2">{entry.at.replace("T", " ").slice(0, 16)}</td>
                    <td className="pr-2">{entry.scope}</td>
                    <td className="pr-2">{entry.rows}</td>
                    <td className="pr-2">{entry.mode}</td>
                    <td>{entry.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RecordNotesPanel({ row, onClose }: { row: OfficeRow; onClose: () => void }) {
  const [draft, setDraft] = useState<NotesDraft>({ gradeOfInterest: "", leadSource: "", interestLevel: 3, concerns: [], nextStep: "", comment: "" });
  const [saved, setSaved] = useState("");

  useEffect(() => {
    const raw = window.localStorage.getItem(notesKey(row.id));
    if (!raw) return;
    try {
      setDraft(JSON.parse(raw) as NotesDraft);
    } catch {
      window.localStorage.removeItem(notesKey(row.id));
    }
  }, [row.id]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      window.localStorage.setItem(notesKey(row.id), JSON.stringify(draft));
      setSaved("Draft saved on this computer");
    }, 400);
    return () => window.clearTimeout(handle);
  }, [draft, row.id]);

  return (
    <aside className="no-print fixed bottom-0 right-0 top-0 z-30 flex w-[min(100%,420px)] flex-col border-l border-[#d5dee8] bg-white shadow-xl">
      <div className="flex items-start justify-between gap-3 border-b border-[#d5dee8] px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5c7388]">Notes</p>
          <h2 className="font-heading text-2xl text-navy-900">{row.cells.Name || "Record"}</h2>
        </div>
        <button type="button" className="text-sm font-semibold" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
        <dl className="space-y-1">
          {row.detail.map((item) => (
            <div key={item.label} className="grid grid-cols-[120px_1fr] gap-2">
              <dt className="text-[#5c7388]">{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
        <label className="block">
          Grade of interest
          <input className="mt-1 w-full rounded border border-[#d5dee8] px-2 py-1" value={draft.gradeOfInterest} onChange={(event) => setDraft({ ...draft, gradeOfInterest: event.target.value })} />
        </label>
        <label className="block">
          Lead source
          <select className="mt-1 w-full rounded border border-[#d5dee8] px-2 py-1" value={draft.leadSource} onChange={(event) => setDraft({ ...draft, leadSource: event.target.value })}>
            <option value="">Select</option>
            {LEAD_SOURCES.map((source) => (
              <option key={source}>{source}</option>
            ))}
          </select>
        </label>
        <label className="block">
          Interest
          <select className="mt-1 w-full rounded border border-[#d5dee8] px-2 py-1" value={draft.interestLevel} onChange={(event) => setDraft({ ...draft, interestLevel: Number(event.target.value) })}>
            {Object.entries(INTEREST_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="font-semibold">Concerns</legend>
          <div className="mt-1 space-y-1">
            {CONCERNS.map((concern) => (
              <label key={concern} className="flex gap-2">
                <input
                  type="checkbox"
                  checked={draft.concerns.includes(concern)}
                  onChange={() =>
                    setDraft((current) => ({
                      ...current,
                      concerns: current.concerns.includes(concern) ? current.concerns.filter((item) => item !== concern) : [...current.concerns, concern],
                    }))
                  }
                />
                {concern}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block">
          Next step
          <select className="mt-1 w-full rounded border border-[#d5dee8] px-2 py-1" value={draft.nextStep} onChange={(event) => setDraft({ ...draft, nextStep: event.target.value })}>
            <option value="">Select</option>
            {NEXT_STEPS.map((step) => (
              <option key={step}>{step}</option>
            ))}
          </select>
        </label>
        <label className="block">
          Comment
          <textarea className="mt-1 w-full rounded border border-[#d5dee8] px-2 py-1" rows={3} value={draft.comment} onChange={(event) => setDraft({ ...draft, comment: event.target.value })} />
        </label>
        <p className="text-xs text-[#5c7388]">{saved}</p>
      </div>
    </aside>
  );
}
