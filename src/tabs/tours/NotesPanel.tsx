"use client";

import { useEffect, useState } from "react";
import { CONCERNS, GRADES, INTEREST_LABELS, LEAD_SOURCES, NEXT_STEPS } from "@/lib/constants";
import type { TourNotes, TourView } from "@/lib/types";

export const NOTES_PANEL_KEY = "risr.notesPanel.open";

export function notesDraftKey(registrationId: number): string {
  return `risr.notesDraft.${registrationId}`;
}

type Draft = Omit<TourNotes, "registrationId" | "updatedAt">;

function initialDraft(tour: TourView): Draft {
  return {
    gradeOfInterest: tour.notes?.gradeOfInterest || tour.students[0]?.grade || "",
    leadSource: tour.notes?.leadSource || tour.inquirySource || "",
    interestLevel: tour.notes?.interestLevel || 3,
    concerns: tour.notes?.concerns ?? [],
    concernOther: tour.notes?.concernOther || "",
    nextStep: tour.notes?.nextStep || "",
    tourGuide: tour.notes?.tourGuide || tour.host || "",
    comment: tour.notes?.comment || tour.note || "",
  };
}

export function NotesPanel({
  tour,
  open,
  busy,
  error,
  guides,
  onSave,
}: {
  tour: TourView;
  open: boolean;
  busy: boolean;
  error: string;
  guides: string[];
  onSave: (notes: Draft) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => initialDraft(tour));
  const [draftNote, setDraftNote] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(notesDraftKey(tour.registrationId));
    if (!saved) return;
    try {
      setDraft(JSON.parse(saved) as Draft);
      setDraftNote("Draft restored on this computer");
    } catch {
      window.localStorage.removeItem(notesDraftKey(tour.registrationId));
    }
  }, [tour.registrationId]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      window.localStorage.setItem(notesDraftKey(tour.registrationId), JSON.stringify(draft));
      setDraftNote("Draft saved on this computer");
    }, 400);
    return () => window.clearTimeout(handle);
  }, [draft, tour.registrationId]);

  function toggleConcern(concern: string) {
    setDraft((current) => ({
      ...current,
      concerns: current.concerns.includes(concern)
        ? current.concerns.filter((item) => item !== concern)
        : [...current.concerns, concern],
    }));
  }

  return (
    <aside
      id="tour-notes-panel"
      aria-hidden={!open}
      className={`no-print fixed bottom-0 right-0 top-0 z-30 flex w-[min(100%,400px)] flex-col border-l border-[#d5dee8] bg-white shadow-xl transition-transform duration-200 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="border-b border-[#d5dee8] px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5c7388]">Structured notes</p>
        <h2 className="font-heading text-2xl text-navy-900">Tour notes</h2>
        <p className="mt-1 text-xs text-[#5c7388]">{draftNote || "Drafts stay on this computer until you save."}</p>
      </div>
      <form
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft);
          window.localStorage.removeItem(notesDraftKey(tour.registrationId));
        }}
      >
        <label className="block">
          <span className="font-semibold">Grade of interest</span>
          <select className="mt-1 w-full rounded border border-[#d5dee8] px-2 py-2" value={draft.gradeOfInterest} onChange={(event) => setDraft({ ...draft, gradeOfInterest: event.target.value })} required>
            <option value="">Select</option>
            {GRADES.map((grade) => (
              <option key={grade}>{grade}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="font-semibold">Lead source</span>
          <select className="mt-1 w-full rounded border border-[#d5dee8] px-2 py-2" value={draft.leadSource} onChange={(event) => setDraft({ ...draft, leadSource: event.target.value })} required>
            <option value="">Select</option>
            {LEAD_SOURCES.map((source) => (
              <option key={source}>{source}</option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="font-semibold">Interest level</legend>
          <div className="mt-2 flex flex-wrap gap-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <label key={level} className={`rounded border px-2 py-1 ${draft.interestLevel === level ? "border-navy-900 bg-navy-900 text-white" : "border-[#d5dee8]"}`}>
                <input className="sr-only" type="radio" name="interest" checked={draft.interestLevel === level} onChange={() => setDraft({ ...draft, interestLevel: level })} />
                {level} {INTEREST_LABELS[level]}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="font-semibold">Concerns</legend>
          <div className="mt-2 grid gap-1">
            {CONCERNS.map((concern) => (
              <label key={concern} className="flex items-center gap-2">
                <input type="checkbox" checked={draft.concerns.includes(concern)} onChange={() => toggleConcern(concern)} />
                {concern}
              </label>
            ))}
          </div>
          {draft.concerns.includes("Other") ? (
            <input className="mt-2 w-full rounded border border-[#d5dee8] px-2 py-2" placeholder="Other concern" value={draft.concernOther} required onChange={(event) => setDraft({ ...draft, concernOther: event.target.value })} />
          ) : null}
        </fieldset>
        <label className="block">
          <span className="font-semibold">Next step</span>
          <select className="mt-1 w-full rounded border border-[#d5dee8] px-2 py-2" value={draft.nextStep} required onChange={(event) => setDraft({ ...draft, nextStep: event.target.value })}>
            <option value="">Select</option>
            {NEXT_STEPS.map((step) => (
              <option key={step}>{step}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="font-semibold">Tour guide</span>
          <input className="mt-1 w-full rounded border border-[#d5dee8] px-2 py-2" value={draft.tourGuide} required list="detail-tour-guides" onChange={(event) => setDraft({ ...draft, tourGuide: event.target.value })} />
          <datalist id="detail-tour-guides">
            {guides.map((guide) => (
              <option key={guide} value={guide} />
            ))}
          </datalist>
        </label>
        <label className="block">
          <span className="font-semibold">Comment</span>
          <textarea className="mt-1 w-full rounded border border-[#d5dee8] px-2 py-2" rows={4} value={draft.comment} onChange={(event) => setDraft({ ...draft, comment: event.target.value })} />
        </label>
        {error ? <p className="text-[#8d2f2f]">{error}</p> : null}
        <button type="submit" disabled={busy} className="w-full rounded bg-navy-900 px-3 py-2 font-semibold text-white disabled:opacity-50">
          {busy ? "Saving…" : "Save"}
        </button>
        <p className="text-xs text-[#5c7388]">
          Save writes the Notes section of the calendar event without emailing guests, and stores the same fields on the master sheet.
        </p>
      </form>
    </aside>
  );
}
