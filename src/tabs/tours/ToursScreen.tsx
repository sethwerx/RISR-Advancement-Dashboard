"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { dashboardConfig } from "@/config/dashboard.config";
import { attendanceLabel } from "@/lib/attendance";
import { GRADES, STATE_LABEL, SYNC_LABEL } from "@/lib/constants";
import { formatLongDate } from "@/lib/time";
import type { Snapshot, SyncPreview, TourView, ToursResponse } from "@/lib/types";
import { NoShowDialog, SheetDialog, SyncDialog } from "@/tabs/tours/dialogs";
import { WalkInDialog } from "@/tabs/tours/WalkInDialog";

const AnalyticsPanel = dynamic(() => import("@/tabs/tours/AnalyticsPanel").then((mod) => mod.AnalyticsPanel), {
  ssr: false,
});

type Filters = {
  query: string;
  grade: string;
  state: string;
  sync: string;
  attendance: string;
  from: string;
  to: string;
};

const emptyFilters: Filters = { query: "", grade: "all", state: "all", sync: "all", attendance: "all", from: "", to: "" };

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "The request failed.");
  return payload;
}

export function ToursScreen() {
  const [data, setData] = useState<ToursResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [syncOpen, setSyncOpen] = useState(false);
  const [preview, setPreview] = useState<SyncPreview | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [noShow, setNoShow] = useState<{ tour: TourView; phase: "confirm" | "remind" } | null>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [docked, setDocked] = useState(false);
  const [matchFilters, setMatchFilters] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  async function load() {
    setError("");
    const response = await fetch("/api/tours", { cache: "no-store" });
    setData(await readJson<ToursResponse>(response));
  }

  useEffect(() => {
    load()
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load tours."))
      .finally(() => setLoading(false));
  }, []);

  function applySnapshot(snapshot: Snapshot) {
    setData((current) =>
      current
        ? {
            ...current,
            tours: snapshot.tours,
            log: snapshot.log,
            sheet: snapshot.sheet ?? current.sheet,
            sheetWarning: snapshot.sheetWarning,
          }
        : current,
    );
    if (snapshot.sheetWarning) setBanner(snapshot.sheetWarning);
  }

  const tours = data?.tours ?? [];
  const filtered = useMemo(() => tours.filter((tour) => matches(tour, filters)), [tours, filters]);
  const now = Date.now();
  const upcoming = filtered.filter((tour) => Date.parse(tour.startIso) >= now).sort((a, b) => a.startIso.localeCompare(b.startIso));
  const past = filtered.filter((tour) => Date.parse(tour.startIso) < now).sort((a, b) => b.startIso.localeCompare(a.startIso));
  const pending = tours.filter((tour) => tour.pendingOaReminder);

  async function openSync() {
    setSyncOpen(true);
    setPreview(null);
    setActionError("");
    try {
      setPreview(await readJson<SyncPreview>(await fetch("/api/sync/preview", { method: "POST" })));
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Could not preview the sync.");
    }
  }

  async function confirmSync() {
    setBusy(true);
    setActionError("");
    try {
      const result = await readJson<Snapshot & { created: Array<{ registrationId: number }>; errors: Array<{ message: string }>; flaggedRescheduled: number; flaggedCanceled: number }>(
        await fetch("/api/sync/apply", { method: "POST" }),
      );
      applySnapshot(result);
      const problems = result.errors.length ? ` ${result.errors.length} could not be created.` : "";
      setBanner(`Created ${result.created.length} calendar event${result.created.length === 1 ? "" : "s"}.${problems} ${result.flaggedRescheduled} rescheduled and ${result.flaggedCanceled} canceled tours were left unchanged.`);
      setSyncOpen(false);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Sync failed.");
    } finally {
      setBusy(false);
    }
  }

  async function postNoShow(tour: TourView, action: "mark" | "undo" | "oa-updated") {
    setBusy(true);
    setActionError("");
    try {
      const snapshot = await readJson<Snapshot>(
        await fetch(`/api/tours/${tour.registrationId}/noshow`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }),
      );
      applySnapshot(snapshot);
      const updated = snapshot.tours.find((item) => item.registrationId === tour.registrationId) ?? tour;
      if (action === "mark") setNoShow({ tour: updated, phase: "remind" });
      else setNoShow(null);
      if (action === "undo") setBanner(`Removed the no-show tag for ${tour.displayName}.`);
      if (action === "oa-updated") setBanner(`Logged that OpenApply was updated for ${tour.displayName}.`);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Could not update the no-show.");
    } finally {
      setBusy(false);
    }
  }

  async function bookWalkIn(values: Record<string, string>) {
    setBusy(true);
    setActionError("");
    try {
      const snapshot = await readJson<Snapshot>(
        await fetch("/api/tours/walk-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        }),
      );
      applySnapshot(snapshot);
      setWalkInOpen(false);
      const created = snapshot.tours
        .filter((tour) => tour.source === "Walk-in")
        .sort((a, b) => b.registrationId - a.registrationId)[0];
      setBanner(created ? `Booked ${created.calendar?.title ?? created.displayName}. Logged with source Walk-in.` : "Walk-in tour booked.");
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Could not book the walk-in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={analyticsOpen && docked ? "lg:flex lg:items-start lg:gap-4" : ""}>
      <div className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 print:block">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5c7388]">Tours / Visits</p>
            <h1 className="font-title text-5xl leading-none text-navy-900">School tours</h1>
            <p className="mt-1 max-w-2xl text-sm text-[#3e556c]">
              OpenApply registrations merged with the School Tour/Visit calendar. Times are Asia/Bangkok. Did Not
              Attend is marked in OpenApply by hand — this dashboard never writes to OpenApply.
            </p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <button type="button" className="rounded border border-[#d5dee8] bg-white px-3 py-2 text-sm font-semibold" onClick={() => setAnalyticsOpen(true)}>
              Analytics
            </button>
            <button type="button" className="rounded border border-[#d5dee8] bg-white px-3 py-2 text-sm font-semibold" onClick={() => setSheetOpen(true)}>
              Master sheet
            </button>
            <Link href="/print" className="rounded border border-[#d5dee8] bg-white px-3 py-2 text-sm font-semibold">
              Meeting print view
            </Link>
            <button type="button" className="rounded bg-navy-900 px-3 py-2 text-sm font-semibold text-white" onClick={() => { setActionError(""); setWalkInOpen(true); }}>
              New Walk-in Tour
            </button>
            <button type="button" className="rounded bg-navy-900 px-3 py-2 text-sm font-semibold text-white" onClick={openSync}>
              Copy OA tours to Calendar
            </button>
          </div>
        </div>

        {data?.mock ? (
          <p className="no-print mb-4 rounded border border-[#d5dee8] bg-white px-3 py-2 text-sm text-[#3e556c]">
            Sample data is loaded. These families are fictional. Add OpenApply and Google credentials to use live
            admissions data. Nothing here is written to OpenApply.
          </p>
        ) : null}
        {data?.account && !data.mock && data.account.message ? (
          <p className="no-print mb-4 rounded border border-[#f0e2c4] bg-[#fff8ea] px-3 py-2 text-sm">{data.account.message}</p>
        ) : null}
        {data?.sheetWarning ? <p className="no-print mb-4 rounded bg-[#fff8ea] px-3 py-2 text-sm">{data.sheetWarning}</p> : null}
        {banner ? (
          <p className="no-print mb-4 rounded bg-[#e7eef8] px-3 py-2 text-sm text-navy-900" role="status">
            {banner}
          </p>
        ) : null}
        {pending.length > 0 ? (
          <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2 rounded border border-[#e7cfc4] bg-[#fbf4f0] px-3 py-2 text-sm">
            <p>
              Attendance still needs to be marked in OpenApply for {pending.length} tour{pending.length === 1 ? "" : "s"}.
            </p>
            <button type="button" className="font-semibold underline" onClick={() => setNoShow({ tour: pending[0], phase: "remind" })}>
              Review
            </button>
          </div>
        ) : null}
        {error ? <p className="mb-4 rounded bg-[#f8e8e6] px-3 py-2 text-sm text-[#8d2f2f]">{error}</p> : null}

        <div className="no-print mb-4 grid gap-2 rounded-lg border border-[#d5dee8] bg-white p-3 md:grid-cols-6">
          <label className="text-xs font-semibold text-[#5c7388] md:col-span-2">
            Search
            <input
              className="mt-1 w-full rounded border border-[#d5dee8] px-2 py-2 text-sm font-normal text-ink"
              value={filters.query}
              placeholder="Name, host, registration"
              onChange={(event) => setFilters({ ...filters, query: event.target.value })}
            />
          </label>
          <label className="text-xs font-semibold text-[#5c7388]">
            From
            <input className="mt-1 w-full rounded border border-[#d5dee8] px-2 py-2 text-sm font-normal" type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
          </label>
          <label className="text-xs font-semibold text-[#5c7388]">
            To
            <input className="mt-1 w-full rounded border border-[#d5dee8] px-2 py-2 text-sm font-normal" type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
          </label>
          <label className="text-xs font-semibold text-[#5c7388]">
            Grade
            <select className="mt-1 w-full rounded border border-[#d5dee8] px-2 py-2 text-sm font-normal" value={filters.grade} onChange={(event) => setFilters({ ...filters, grade: event.target.value })}>
              <option value="all">All grades</option>
              {GRADES.map((grade) => (
                <option key={grade}>{grade}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#5c7388]">
            State
            <select className="mt-1 w-full rounded border border-[#d5dee8] px-2 py-2 text-sm font-normal" value={filters.state} onChange={(event) => setFilters({ ...filters, state: event.target.value })}>
              <option value="all">All states</option>
              <option value="scheduled">Scheduled</option>
              <option value="canceled">Canceled</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-[#5c7388] md:col-span-2">
            Calendar
            <select className="mt-1 w-full rounded border border-[#d5dee8] px-2 py-2 text-sm font-normal" value={filters.sync} onChange={(event) => setFilters({ ...filters, sync: event.target.value })}>
              <option value="all">All sync states</option>
              <option value="synced">Synced</option>
              <option value="missing">Missing on calendar</option>
              <option value="rescheduled">Rescheduled in OA</option>
              <option value="canceled">Canceled in OA</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-[#5c7388]">
            Attendance
            <select className="mt-1 w-full rounded border border-[#d5dee8] px-2 py-2 text-sm font-normal" value={filters.attendance} onChange={(event) => setFilters({ ...filters, attendance: event.target.value })}>
              <option value="all">All</option>
              <option value="Attended">Attended</option>
              <option value="No show">No show</option>
            </select>
          </label>
          <div className="flex items-end md:col-span-2">
            <button type="button" className="text-sm font-semibold text-navy-800 underline" onClick={() => setFilters(emptyFilters)}>
              Clear filters
            </button>
          </div>
        </div>

        {loading ? <p className="text-sm text-[#5c7388]">Loading tours…</p> : null}
        {!loading && filtered.length === 0 ? (
          <p className="rounded border border-dashed border-[#d5dee8] bg-white px-4 py-8 text-sm text-[#5c7388]">
            No tours match these filters.
          </p>
        ) : null}
        <TourSection title="Upcoming" tours={upcoming} onNoShow={(tour) => { setActionError(""); setNoShow({ tour, phase: "confirm" }); }} />
        <TourSection title="Past" tours={past} onNoShow={(tour) => { setActionError(""); setNoShow({ tour, phase: "confirm" }); }} />
        <p className="no-print mt-4 text-xs text-[#5c7388]">
          Rescheduled and canceled tours that are already on the calendar are flagged only. Sync does not move or delete
          them. Office: {dashboardConfig.school.office}.
        </p>
      </div>

      {analyticsOpen ? (
        <AnalyticsPanel
          tours={matchFilters ? filtered : tours}
          docked={docked}
          matchFilters={matchFilters}
          onToggleFilters={() => setMatchFilters((value) => !value)}
          onToggleDock={() => setDocked((value) => !value)}
          onClose={() => setAnalyticsOpen(false)}
        />
      ) : null}

      {syncOpen ? <SyncDialog preview={preview} busy={busy} error={actionError} onClose={() => setSyncOpen(false)} onConfirm={confirmSync} /> : null}
      {noShow ? (
        <NoShowDialog
          tour={noShow.tour}
          phase={noShow.phase}
          busy={busy}
          error={actionError}
          onClose={() => setNoShow(null)}
          onMark={() => postNoShow(noShow.tour, "mark")}
          onUndo={() => postNoShow(noShow.tour, "undo")}
          onDone={() => postNoShow(noShow.tour, "oa-updated")}
        />
      ) : null}
      {walkInOpen ? <WalkInDialog busy={busy} error={actionError} onClose={() => setWalkInOpen(false)} onSubmit={bookWalkIn} /> : null}
      {sheetOpen && data ? <SheetDialog tours={data.tours} log={data.log} sheetUrl={data.sheet?.url ?? ""} onClose={() => setSheetOpen(false)} /> : null}
    </div>
  );
}

function matches(tour: TourView, filters: Filters): boolean {
  if (filters.from && tour.date < filters.from) return false;
  if (filters.to && tour.date > filters.to) return false;
  if (filters.grade !== "all" && !tour.students.some((student) => student.grade === filters.grade)) return false;
  if (filters.state !== "all" && tour.state !== filters.state) return false;
  if (filters.sync !== "all" && tour.syncStatus !== filters.sync) return false;
  if (filters.attendance !== "all" && attendanceLabel(tour) !== filters.attendance) return false;
  if (filters.query.trim()) {
    const haystack = [
      tour.displayName,
      tour.host,
      tour.statusLabel,
      tour.gradesLabel,
      String(tour.registrationId),
      ...tour.students.flatMap((student) => [student.preferredName, student.firstName, student.lastName, student.thaiNickname]),
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(filters.query.trim().toLowerCase())) return false;
  }
  return true;
}

function TourSection({
  title,
  tours,
  onNoShow,
}: {
  title: string;
  tours: TourView[];
  onNoShow: (tour: TourView) => void;
}) {
  if (tours.length === 0) return null;
  return (
    <section className="mb-6">
      <h2 className="mb-2 font-heading text-2xl text-navy-900">
        {title} <span className="text-base text-[#5c7388]">{tours.length}</span>
      </h2>
      <div className="overflow-x-auto rounded-lg border border-[#d5dee8] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#f7fafc] text-xs uppercase tracking-wide text-[#5c7388]">
            <tr>
              <th className="px-3 py-2 font-semibold">Date</th>
              <th className="px-3 py-2 font-semibold">Time</th>
              <th className="px-3 py-2 font-semibold">Students</th>
              <th className="px-3 py-2 font-semibold">Grade</th>
              <th className="px-3 py-2 font-semibold">OA status</th>
              <th className="px-3 py-2 font-semibold">State</th>
              <th className="px-3 py-2 font-semibold">Host</th>
              <th className="px-3 py-2 font-semibold">Calendar</th>
              <th className="no-print px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tours.map((tour) => (
              <tr key={tour.registrationId} className={`border-t border-[#e6eef5] ${tour.pendingOaReminder ? "bg-[#fbf4f0]" : ""}`}>
                <td className="whitespace-nowrap px-3 py-3 align-top">
                  <div>{formatLongDate(tour.date)}</div>
                  <div className="text-xs text-[#5c7388]">{tour.eventLabel}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 align-top">{tour.timeLabel}</td>
                <td className="px-3 py-3 align-top">
                  <Link href={`/tours/${tour.registrationId}`} className="text-left font-semibold text-navy-900 underline decoration-[#d5dee8]">
                    {tour.displayName}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-3 py-3 align-top">{tour.gradesLabel}</td>
                <td className="px-3 py-3 align-top">{tour.statusLabel || "—"}</td>
                <td className="whitespace-nowrap px-3 py-3 align-top">{STATE_LABEL[tour.state]}</td>
                <td className="whitespace-nowrap px-3 py-3 align-top">{tour.host || "—"}</td>
                <td className="px-3 py-3 align-top">
                  <div className="flex flex-wrap items-center gap-1">
                    <Chip kind={tour.syncStatus}>{SYNC_LABEL[tour.syncStatus]}</Chip>
                    {attendanceLabel(tour) === "Attended" ? <Chip kind="attended">Attended</Chip> : null}
                    {tour.noShow ? <Chip kind="noshow">No show</Chip> : null}
                  </div>
                  {tour.syncStatus === "rescheduled" && tour.calendar ? (
                    <p className="mt-1 max-w-[14rem] text-xs text-[#5c7388]">Calendar still has {tour.calendar.whenLabel}</p>
                  ) : null}
                  {tour.syncStatus === "canceled" && tour.calendar ? (
                    <p className="mt-1 text-xs text-[#5c7388]">Still on the calendar</p>
                  ) : null}
                  {tour.syncStatus === "missing" ? <p className="mt-1 text-xs text-[#5c7388]">Not on the calendar</p> : null}
                </td>
                <td className="no-print whitespace-nowrap px-3 py-3 align-top">
                  <button
                    type="button"
                    className="mr-2 font-semibold text-navy-800 underline disabled:cursor-not-allowed disabled:text-[#8aa0b4] disabled:no-underline"
                    disabled={!tour.calendar}
                    title={tour.calendar ? "Update the calendar title" : "Not on the calendar yet"}
                    onClick={() => onNoShow(tour)}
                  >
                    {tour.noShow ? "Undo no-show" : "No show"}
                  </button>
                  <Link href={`/tours/${tour.registrationId}`} className="font-semibold text-navy-800 underline">
                    Notes{tour.notes ? " ·" : ""}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Chip({ kind, children }: { kind: TourView["syncStatus"] | "noshow" | "attended"; children: React.ReactNode }) {
  const tone = {
    synced: "bg-[#e5f4ec] text-[#145c38]",
    missing: "bg-[#fff4d6] text-[#7a4b00]",
    rescheduled: "bg-[#e7eef8] text-[#1d4e89]",
    canceled: "bg-[#f8e8e6] text-[#8d2f2f]",
    noshow: "bg-[#f3e6dc] text-[#7a341f]",
    attended: "bg-[#e5f4ec] text-[#145c38]",
  }[kind];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>{children}</span>;
}
