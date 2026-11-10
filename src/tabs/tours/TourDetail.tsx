"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ExportBrandHeader } from "@/components/shell/BrandLogo";
import { attendanceLabel } from "@/lib/attendance";
import { STATE_LABEL, SYNC_LABEL } from "@/lib/constants";
import { formatLongDate } from "@/lib/time";
import type { Snapshot, TourNotes, TourView, ToursResponse } from "@/lib/types";
import { NOTES_PANEL_KEY, NotesPanel } from "@/tabs/tours/NotesPanel";

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "The request failed.");
  return payload;
}

export function TourDetail() {
  const params = useParams<{ id: string }>();
  const registrationId = Number(params.id);
  const [tour, setTour] = useState<TourView | null>(null);
  const [guides, setGuides] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(window.localStorage.getItem(NOTES_PANEL_KEY) === "1");
    fetch("/api/tours", { cache: "no-store" })
      .then((response) => readJson<ToursResponse>(response))
      .then((payload) => {
        setTour(payload.tours.find((item) => item.registrationId === registrationId) ?? null);
        setGuides([...new Set(payload.tours.map((item) => item.host).filter(Boolean))].sort());
        if (!payload.tours.some((item) => item.registrationId === registrationId)) {
          setError("That tour is not in the current list.");
        }
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load this tour."));
  }, [registrationId]);

  function togglePanel() {
    setOpen((current) => {
      const next = !current;
      window.localStorage.setItem(NOTES_PANEL_KEY, next ? "1" : "0");
      return next;
    });
  }

  async function save(notes: Omit<TourNotes, "registrationId" | "updatedAt">) {
    if (!tour) return;
    setBusy(true);
    setActionError("");
    try {
      const snapshot = await readJson<Snapshot>(
        await fetch(`/api/tours/${tour.registrationId}/notes`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(notes),
        }),
      );
      const updated = snapshot.tours.find((item) => item.registrationId === tour.registrationId) ?? null;
      setTour(updated);
      setBanner(snapshot.sheetWarning || "Saved to the calendar Notes section and the master sheet.");
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Could not save notes.");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <p className="text-sm text-[#8d2f2f]">
        {error} <Link className="font-semibold underline" href="/">Back to tours</Link>
      </p>
    );
  }
  if (!tour) return <p className="text-sm text-[#5c7388]">Loading tour…</p>;

  const attended = attendanceLabel(tour);

  return (
    <div className={open ? "pr-0 lg:pr-[400px]" : ""}>
      <ExportBrandHeader label="Tour detail" />
      <Link href="/" className="text-sm font-semibold text-navy-800 underline">
        Back to tours
      </Link>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#5c7388]">{tour.eventLabel}</p>
      <h1 className="font-title text-5xl leading-none text-navy-900">{tour.displayName}</h1>
      <p className="mt-2 text-sm text-[#3e556c]">
        {formatLongDate(tour.date)} · {tour.timeLabel} · {tour.campus}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full bg-[#e7eef8] px-2 py-1 text-[#1d4e89]">{SYNC_LABEL[tour.syncStatus]}</span>
        <span className="rounded-full bg-[#f4f7fa] px-2 py-1">{STATE_LABEL[tour.state]}</span>
        {attended ? (
          <span className={`rounded-full px-2 py-1 ${attended === "Attended" ? "bg-[#e5f4ec] text-[#145c38]" : "bg-[#f3e6dc] text-[#7a341f]"}`}>
            {attended}
          </span>
        ) : null}
        <span className="rounded-full bg-[#f4f7fa] px-2 py-1">{tour.source}</span>
      </div>
      {banner ? <p className="mt-4 rounded bg-[#e7eef8] px-3 py-2 text-sm">{banner}</p> : null}
      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-[#5c7388]">OA status</dt>
          <dd>{tour.statusLabel || "—"}</dd>
        </div>
        <div>
          <dt className="text-[#5c7388]">Host</dt>
          <dd>{tour.host || "—"}</dd>
        </div>
        <div>
          <dt className="text-[#5c7388]">Grade</dt>
          <dd>{tour.gradesLabel}</dd>
        </div>
        <div>
          <dt className="text-[#5c7388]">Registration</dt>
          <dd>{tour.registrationId}</dd>
        </div>
      </dl>
      {tour.note ? <p className="mt-4 text-sm">{tour.note}</p> : null}
      <h2 className="mt-6 font-heading text-2xl text-navy-900">Students</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {tour.students.map((student) => (
          <li key={`${student.firstName}-${student.lastName}`}>
            {student.profileUrl ? (
              <a className="font-semibold text-navy-800 underline" href={student.profileUrl} target="_blank" rel="noreferrer">
                {student.firstName} {student.preferredName ? `(${student.preferredName}) ` : ""}
                {student.lastName}
              </a>
            ) : (
              <span className="font-semibold">
                {student.firstName} {student.preferredName ? `(${student.preferredName}) ` : ""}
                {student.lastName}
              </span>
            )}{" "}
            · {student.grade} · {student.status || "No status"}
          </li>
        ))}
      </ul>
      <h2 className="mt-6 font-heading text-2xl text-navy-900">Parents</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {tour.parents.map((parent) => (
          <li key={`${parent.email}-${parent.name}`}>
            {parent.name} · {parent.role}
            {parent.email ? ` · ${parent.email}` : ""}
            {parent.phone ? ` · ${parent.phone}` : ""}
          </li>
        ))}
      </ul>
      {tour.calendar?.htmlLink ? (
        <a className="mt-4 inline-block text-sm font-semibold text-navy-800 underline" href={tour.calendar.htmlLink} target="_blank" rel="noreferrer">
          Open calendar event
        </a>
      ) : null}

      <button
        type="button"
        className="no-print fixed top-36 z-40 rounded-l bg-navy-900 px-2 py-3 font-heading text-xs uppercase tracking-[0.14em] text-white"
        style={{ right: open ? "min(100%, 400px)" : 0 }}
        aria-expanded={open}
        aria-controls="tour-notes-panel"
        onClick={togglePanel}
      >
        {open ? "Close" : "Notes"}
      </button>
      <NotesPanel tour={tour} open={open} busy={busy} error={actionError} guides={guides} onSave={save} />
    </div>
  );
}
