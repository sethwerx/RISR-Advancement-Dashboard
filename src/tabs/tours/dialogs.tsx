"use client";

import { useEffect, useMemo, useState } from "react";
import { dashboardConfig } from "@/config/dashboard.config";
import { CONCERNS, GRADES, INTEREST_LABELS, LEAD_SOURCES, NEXT_STEPS, SYNC_LABEL } from "@/lib/constants";
import { logSheetRows, printSheetRows, tourSheetRows } from "@/lib/sheet/rows";
import { formatIctTimestamp } from "@/lib/time";
import type { NoShowLogEntry, SyncPreview, TourNotes, TourView } from "@/lib/types";

export function DialogFrame({
  title,
  children,
  onClose,
  dismissable = true,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  dismissable?: boolean;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!dismissable || !onClose) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismissable, onClose]);

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-950/50 p-4"
      onMouseDown={(event) => {
        if (dismissable && event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`my-8 w-full rounded-lg border border-[#d5dee8] bg-white shadow-xl ${wide ? "max-w-3xl" : "max-w-xl"}`}
      >
        {children}
      </div>
    </div>
  );
}

export function SyncDialog({
  preview,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  preview: SyncPreview | null;
  busy: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const creates = preview?.create.length ?? 0;
  return (
    <DialogFrame title="Copy OA tours to Calendar" onClose={onClose} wide>
      <div className="border-b border-[#d5dee8] px-5 py-4">
        <h2 className="font-title text-4xl text-navy-900">Copy OA tours to Calendar</h2>
        <p className="mt-2 text-sm text-[#3e556c]">
          New scheduled tours are created on {dashboardConfig.google.calendarName}. The organizer is{" "}
          {dashboardConfig.google.organizerEmail}. Guests: {dashboardConfig.google.guestEmails.join(", ")}. A notes doc
          is copied from the template and attached as Tour Notes. No Google Meet link is added. Creating an event may
          send the normal invite. Later edits do not email anyone. Rescheduled and canceled tours that are already on
          the calendar are only flagged.
        </p>
      </div>
      <div className="space-y-4 px-5 py-4 text-sm">
        {!preview ? <p>Preparing the preview…</p> : null}
        {preview ? (
          <>
            <section>
              <h3 className="font-semibold text-navy-900">Will create ({creates})</h3>
              {creates === 0 ? (
                <p className="mt-1 text-[#5c7388]">No scheduled tours are missing from the calendar.</p>
              ) : (
                <ul className="mt-2 divide-y divide-[#e6eef5] rounded border border-[#e6eef5]">
                  {preview.create.map((item) => (
                    <li key={item.registrationId} className="px-3 py-2">
                      <p className="font-semibold">{item.displayName}</p>
                      <p className="text-[#5c7388]">
                        {item.date} · {item.timeLabel} · {item.eventLabel}
                      </p>
                      <p className="text-xs text-[#3e556c]">{item.title}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <FlagList
              title="Rescheduled in OA — left unchanged"
              empty="No rescheduled tours."
              items={preview.rescheduled}
            />
            <FlagList
              title="Canceled in OA — left on the calendar"
              empty="No canceled tours are still on the calendar."
              items={preview.canceledOnCalendar}
            />
            <p className="text-[#5c7388]">
              {preview.syncedCount} already synced. {preview.canceledWithoutEventCount} canceled registrations have no
              calendar event and will not get one.
            </p>
          </>
        ) : null}
        {error ? <p className="text-[#8d2f2f]">{error}</p> : null}
      </div>
      <div className="flex justify-end gap-2 border-t border-[#d5dee8] px-5 py-3">
        <button type="button" className="rounded border border-[#d5dee8] px-3 py-2 text-sm" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          disabled={busy || creates === 0}
          className="rounded bg-navy-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          onClick={onConfirm}
        >
          {busy ? "Creating…" : `Create ${creates} calendar event${creates === 1 ? "" : "s"}`}
        </button>
      </div>
    </DialogFrame>
  );
}

function FlagList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: SyncPreview["rescheduled"];
}) {
  return (
    <section>
      <h3 className="font-semibold text-navy-900">
        {title} ({items.length})
      </h3>
      {items.length === 0 ? (
        <p className="mt-1 text-[#5c7388]">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {items.map((item) => (
            <li key={item.registrationId}>
              <span className="font-semibold">{item.displayName}</span>
              <span className="text-[#5c7388]">
                {" "}
                — OA {item.oaWhen}; calendar {item.calendarWhen}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function NoShowDialog({
  tour,
  phase,
  busy,
  error,
  onClose,
  onMark,
  onUndo,
  onDone,
}: {
  tour: TourView;
  phase: "confirm" | "remind";
  busy: boolean;
  error: string;
  onClose: () => void;
  onMark: () => void;
  onUndo: () => void;
  onDone: () => void;
}) {
  const reminding = phase === "remind";
  return (
    <DialogFrame title="No show" onClose={onClose} dismissable={!reminding}>
      <div className="px-5 py-5">
        {reminding ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8d3b2f]">Attendance</p>
            <h2 className="mt-2 font-title text-4xl leading-tight text-navy-900">
              Remember to mark &lsquo;Did Not Attend&rsquo; in OpenApply for {tour.displayName}
            </h2>
            <p className="mt-3 text-sm text-[#3e556c]">
              The calendar title now includes [No Show]. Guests were not emailed. OpenApply was not changed. This
              reminder stays until you confirm the profile is updated.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              {tour.students.map((student) => (
                <li key={student.id}>
                  <a className="font-semibold text-navy-800 underline" href={student.profileUrl} target="_blank" rel="noreferrer">
                    Open OA profile — {student.firstName} {student.lastName}
                  </a>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <h2 className="font-title text-4xl text-navy-900">
              {tour.noShow ? "Remove the no-show tag?" : "Mark this tour as a no-show?"}
            </h2>
            <p className="mt-3 text-sm text-[#3e556c]">
              {tour.displayName} · {tour.date} · {tour.timeLabel}. The calendar title is updated with sendUpdates=none,
              so the family is not emailed, and the Meet link is left untouched.
            </p>
          </>
        )}
        {error ? <p className="mt-3 text-sm text-[#8d2f2f]">{error}</p> : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {reminding ? (
            <>
              <button type="button" className="rounded border border-[#d5dee8] px-3 py-2 text-sm" disabled={busy} onClick={onUndo}>
                Undo
              </button>
              <button type="button" className="rounded bg-navy-900 px-3 py-2 text-sm font-semibold text-white" disabled={busy} onClick={onDone}>
                {busy ? "Saving…" : "Done"}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="rounded border border-[#d5dee8] px-3 py-2 text-sm" onClick={onClose}>
                Cancel
              </button>
              {tour.noShow ? (
                <button type="button" className="rounded bg-navy-900 px-3 py-2 text-sm font-semibold text-white" disabled={busy} onClick={onUndo}>
                  {busy ? "Updating…" : "Remove tag"}
                </button>
              ) : (
                <button type="button" className="rounded bg-navy-900 px-3 py-2 text-sm font-semibold text-white" disabled={busy} onClick={onMark}>
                  {busy ? "Updating…" : "Mark no-show"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </DialogFrame>
  );
}

export function NotesDialog({
  tour,
  busy,
  error,
  guides,
  onClose,
  onSave,
}: {
  tour: TourView;
  busy: boolean;
  error: string;
  guides: string[];
  onClose: () => void;
  onSave: (notes: Omit<TourNotes, "registrationId" | "updatedAt">) => void;
}) {
  const existing = tour.notes;
  const [gradeOfInterest, setGrade] = useState(existing?.gradeOfInterest || tour.students[0]?.grade || "");
  const [leadSource, setLead] = useState(existing?.leadSource || "");
  const [interestLevel, setLevel] = useState(existing?.interestLevel || 3);
  const [concerns, setConcerns] = useState<string[]>(existing?.concerns ?? []);
  const [concernOther, setOther] = useState(existing?.concernOther || "");
  const [nextStep, setNext] = useState(existing?.nextStep || "");
  const [tourGuide, setGuide] = useState(existing?.tourGuide || tour.host || "");
  const [comment, setComment] = useState(existing?.comment || "");

  function toggleConcern(concern: string) {
    setConcerns((current) => (current.includes(concern) ? current.filter((item) => item !== concern) : [...current, concern]));
  }

  return (
    <DialogFrame title="Tour notes" onClose={onClose} wide>
      <form
        className="px-5 py-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({ gradeOfInterest, leadSource, interestLevel, concerns, concernOther, nextStep, tourGuide, comment });
        }}
      >
        <h2 className="font-title text-4xl text-navy-900">Tour notes</h2>
        <p className="mt-1 text-sm text-[#5c7388]">
          {tour.displayName} · {tour.date}. Saved to the master sheet and appended to the tour notes doc.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-semibold">Grade of interest</span>
            <select className="mt-1 w-full rounded border border-[#d5dee8] px-2 py-2" value={gradeOfInterest} onChange={(event) => setGrade(event.target.value)} required>
              <option value="">Select</option>
              {GRADES.map((grade) => (
                <option key={grade}>{grade}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="font-semibold">Lead source</span>
            <select className="mt-1 w-full rounded border border-[#d5dee8] px-2 py-2" value={leadSource} onChange={(event) => setLead(event.target.value)} required>
              <option value="">Select</option>
              {LEAD_SOURCES.map((source) => (
                <option key={source}>{source}</option>
              ))}
            </select>
          </label>
          <fieldset className="text-sm sm:col-span-2">
            <legend className="font-semibold">Interest level</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <label key={level} className={`rounded border px-2 py-1 ${interestLevel === level ? "border-navy-900 bg-navy-900 text-white" : "border-[#d5dee8]"}`}>
                  <input className="sr-only" type="radio" name="interest" checked={interestLevel === level} onChange={() => setLevel(level)} />
                  {level} {INTEREST_LABELS[level]}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="text-sm sm:col-span-2">
            <legend className="font-semibold">Concerns</legend>
            <div className="mt-2 grid gap-1 sm:grid-cols-2">
              {CONCERNS.map((concern) => (
                <label key={concern} className="flex items-center gap-2">
                  <input type="checkbox" checked={concerns.includes(concern)} onChange={() => toggleConcern(concern)} />
                  {concern}
                </label>
              ))}
            </div>
            {concerns.includes("Other") ? (
              <input
                className="mt-2 w-full rounded border border-[#d5dee8] px-2 py-2"
                placeholder="Other concern"
                value={concernOther}
                onChange={(event) => setOther(event.target.value)}
                required
              />
            ) : null}
          </fieldset>
          <label className="text-sm">
            <span className="font-semibold">Next step</span>
            <select className="mt-1 w-full rounded border border-[#d5dee8] px-2 py-2" value={nextStep} onChange={(event) => setNext(event.target.value)} required>
              <option value="">Select</option>
              {NEXT_STEPS.map((step) => (
                <option key={step}>{step}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="font-semibold">Tour guide</span>
            <input className="mt-1 w-full rounded border border-[#d5dee8] px-2 py-2" value={tourGuide} onChange={(event) => setGuide(event.target.value)} required list="tour-guides" />
            <datalist id="tour-guides">
              {guides.map((guide) => (
                <option key={guide} value={guide} />
              ))}
            </datalist>
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="font-semibold">Comment</span>
            <textarea className="mt-1 w-full rounded border border-[#d5dee8] px-2 py-2" rows={3} value={comment} onChange={(event) => setComment(event.target.value)} />
          </label>
        </div>
        {error ? <p className="mt-3 text-sm text-[#8d2f2f]">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded border border-[#d5dee8] px-3 py-2 text-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={busy} className="rounded bg-navy-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "Saving…" : "Save notes"}
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}

export function DetailDialog({ tour, onClose }: { tour: TourView; onClose: () => void }) {
  return (
    <DialogFrame title="Tour details" onClose={onClose} wide>
      <div className="px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5c7388]">{tour.eventLabel}</p>
        <h2 className="mt-1 font-title text-4xl text-navy-900">{tour.displayName}</h2>
        <p className="mt-1 text-sm text-[#3e556c]">
          {tour.date} · {tour.timeLabel} · {tour.campus} · Host {tour.host || "—"}
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[#5c7388]">OA status</dt>
            <dd>{tour.statusLabel || "—"}</dd>
          </div>
          <div>
            <dt className="text-[#5c7388]">Registration</dt>
            <dd>
              {tour.registrationId} · {tour.state}
            </dd>
          </div>
          <div>
            <dt className="text-[#5c7388]">Calendar</dt>
            <dd>{SYNC_LABEL[tour.syncStatus]}{tour.noShow ? " · No show" : ""}</dd>
          </div>
          <div>
            <dt className="text-[#5c7388]">Attendees</dt>
            <dd>{tour.attendeesCount}</dd>
          </div>
        </dl>
        {tour.note ? <p className="mt-3 text-sm">{tour.note}</p> : null}
        <h3 className="mt-4 font-semibold">Students</h3>
        <ul className="mt-1 space-y-1 text-sm">
          {tour.students.map((student) => (
            <li key={student.id}>
              <a className="font-semibold text-navy-800 underline" href={student.profileUrl} target="_blank" rel="noreferrer">
                {student.firstName} {student.preferredName ? `(${student.preferredName}) ` : ""}
                {student.lastName}
              </a>{" "}
              · {student.grade} · {student.status || "No status"}
              {student.thaiNickname ? ` · ${student.thaiNickname}` : ""}
            </li>
          ))}
        </ul>
        <h3 className="mt-4 font-semibold">Parents</h3>
        <ul className="mt-1 space-y-1 text-sm">
          {tour.parents.map((parent) => (
            <li key={`${parent.email}-${parent.name}`}>
              {parent.name} · {parent.role}
              {parent.email ? ` · ${parent.email}` : ""}
              {parent.phone ? ` · ${parent.phone}` : ""}
            </li>
          ))}
        </ul>
        {tour.calendar?.notesDocUrl ? (
          <div className="mt-4">
            <h3 className="font-semibold">Tour Notes</h3>
            {tour.calendar.notesDocUrl.startsWith("http") ? (
              <a className="text-sm font-semibold text-navy-800 underline" href={tour.calendar.notesDocUrl} target="_blank" rel="noreferrer">
                {tour.calendar.notesDocName || "Open the notes doc"}
              </a>
            ) : (
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-[#f4f7fa] p-3 text-xs">{tour.calendar.notesDocBody}</pre>
            )}
          </div>
        ) : null}
        {tour.calendar?.htmlLink ? (
          <a className="mt-3 inline-block text-sm font-semibold text-navy-800 underline" href={tour.calendar.htmlLink} target="_blank" rel="noreferrer">
            Open calendar event
          </a>
        ) : null}
        <div className="mt-5 flex justify-end">
          <button type="button" className="rounded bg-navy-900 px-3 py-2 text-sm font-semibold text-white" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </DialogFrame>
  );
}

export function SheetDialog({
  tours,
  log,
  sheetUrl,
  onClose,
}: {
  tours: TourView[];
  log: NoShowLogEntry[];
  sheetUrl: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"Tours" | "No Show Log" | "Print">("Tours");
  const grids = useMemo(
    () => ({
      Tours: tourSheetRows(tours),
      "No Show Log": logSheetRows(log),
      Print: printSheetRows(tours),
    }),
    [tours, log],
  );
  const grid = grids[tab];
  return (
    <DialogFrame title="Master sheet" onClose={onClose} wide>
      <div className="px-5 py-5">
        <h2 className="font-title text-4xl text-navy-900">Master sheet</h2>
        <p className="mt-2 text-sm text-[#3e556c]">
          Tours holds one row per registration. No Show Log is the attendance reminder trail. Print is the Tours/Visits
          view: frozen header, date-range filter, and columns sized for landscape fit-to-width. Future dashboard tabs
          get their own sheet tab.
          {sheetUrl ? "" : " Sample mode keeps this workbook in local sample storage."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["Tours", "No Show Log", "Print"] as const).map((name) => (
            <button
              key={name}
              type="button"
              className={`rounded px-3 py-1 text-sm ${tab === name ? "bg-navy-900 text-white" : "border border-[#d5dee8]"}`}
              onClick={() => setTab(name)}
            >
              {name}
            </button>
          ))}
          {sheetUrl ? (
            <a className="rounded border border-[#d5dee8] px-3 py-1 text-sm font-semibold" href={sheetUrl} target="_blank" rel="noreferrer">
              Open in Google Sheets
            </a>
          ) : null}
        </div>
        <div className="mt-3 max-h-[50vh] overflow-auto rounded border border-[#e6eef5]">
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 bg-navy-900 text-white">
              <tr>
                {grid[0]?.map((header) => (
                  <th key={header} className="whitespace-nowrap px-2 py-2 font-semibold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.slice(1).map((row, index) => (
                <tr key={`${tab}-${index}`} className="border-t border-[#e6eef5]">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="whitespace-nowrap px-2 py-1.5">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-[#5c7388]">Log times display in ICT. Latest entry: {log[0] ? formatIctTimestamp(log.slice().sort((a, b) => b.at.localeCompare(a.at))[0].at) : "none"}.</p>
        <div className="mt-4 flex justify-end">
          <button type="button" className="rounded bg-navy-900 px-3 py-2 text-sm font-semibold text-white" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </DialogFrame>
  );
}
