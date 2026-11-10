import { useEffect, useState } from "react";
import type { LocalTour } from "@/lib/standalone/data";
import { descriptionWithNotes, notesForEditor, tourNoteInserts, tourNotesAttachment } from "@/lib/standalone/tour-notes";
import { calendarWrite, readCalendarEvent, readTourNotesDoc, writeTourNotesDoc } from "./google";

export function TourNotesSlide({ tour, token, calendarId, onClose, onSynced }: { tour: LocalTour; token: string; calendarId: string; onClose: () => void; onSynced: (message: string) => void }) {
  const storageKey = `risr.tourNotes.${tour.id}`;
  const [notes, setNotes] = useState("");
  const [syncedAt, setSyncedAt] = useState("");
  const [doc, setDoc] = useState<{ fileId: string; fileUrl: string; endIndex: number } | null>(null);
  const [status, setStatus] = useState("Loading notes…");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    async function load() {
      const local = localStorage.getItem(storageKey) ?? tour.note ?? "";
      if (!token || !tour.calendarEventId) {
        const offline = notesForEditor({ description: "", docText: "", localComment: local });
        if (!cancel) {
          setNotes(offline.text);
          setStatus(token ? "This tour has no calendar event yet. Notes stay on this computer until it does." : "Sign in to read and write the School Tour/Visit calendar.");
        }
        return;
      }
      try {
        const event = await readCalendarEvent(token, calendarId, tour.calendarEventId);
        const attachment = tourNotesAttachment(event.attachments);
        let docText = "";
        let endIndex = 2;
        if (attachment) {
          const loaded = await readTourNotesDoc(token, attachment.fileId);
          docText = loaded.text;
          endIndex = loaded.endIndex;
          if (!cancel) setDoc({ ...attachment, endIndex });
        } else if (tour.notesDoc) {
          if (!cancel) setDoc({ fileId: "", fileUrl: tour.notesDoc, endIndex: 2 });
        }
        const editor = notesForEditor({ description: event.description, docText, localComment: local });
        if (cancel) return;
        setNotes(editor.text);
        setSyncedAt(event.updated);
        setStatus(editor.migrated ? "An earlier dashboard comment was appended. Save to keep it on the calendar." : "Loaded from the School Tour/Visit calendar.");
        if (editor.migrated) localStorage.setItem(storageKey, editor.text);
      } catch (reason) {
        if (cancel) return;
        const fallback = notesForEditor({ description: "", docText: "", localComment: local });
        setNotes(fallback.text);
        setError(reason instanceof Error ? reason.message : "Could not read the calendar notes.");
      }
    }
    void load();
    return () => {
      cancel = true;
    };
  }, [tour.id, tour.calendarEventId, tour.note, tour.notesDoc, token, calendarId, storageKey]);

  async function save() {
    setError("");
    localStorage.setItem(storageKey, notes);
    if (!token || !tour.calendarEventId) {
      onSynced("Notes saved on this computer. Sign in to write them to the calendar.");
      return;
    }
    const event = await readCalendarEvent(token, calendarId, tour.calendarEventId);
    const description = descriptionWithNotes(event.description, notes);
    await calendarWrite(token, calendarId, `/events/${encodeURIComponent(tour.calendarEventId)}`, "PATCH", { description });
    const attachment = tourNotesAttachment(event.attachments) ?? (doc?.fileId ? doc : null);
    if (attachment?.fileId) {
      const current = await readTourNotesDoc(token, attachment.fileId);
      await writeTourNotesDoc(token, attachment.fileId, notes, current.endIndex);
    }
    const refreshed = await readCalendarEvent(token, calendarId, tour.calendarEventId);
    setSyncedAt(refreshed.updated);
    setStatus("Saved to the calendar event. Guests were not emailed.");
    onSynced("Notes written to Calendar (sendUpdates=none).");
  }

  return (
    <aside className="slide">
      <header><h3 className="font-heading">{tour.students}</h3><button className="btn" type="button" onClick={onClose}>Close</button></header>
      <div className="body">
        <p className="lede">Notes</p>
        <dl>
          {[["Date", tour.date], ["Time", tour.time], ["Host", tour.host], ["Attendance", tour.attendance]].filter(([, value]) => value).map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
        <p className="lede">{status}{syncedAt ? ` Last synced ${syncedAt.replace("T", " ").replace(/\.\d+Z$/, " UTC")}.` : ""}</p>
        {doc?.fileUrl ? <p><a href={doc.fileUrl} target="_blank" rel="noreferrer">Tour Notes doc</a></p> : null}
        {error ? <p className="warn" role="alert">{error}</p> : null}
        <div className="chip-row" aria-label="Note templates">
          {tourNoteInserts.map((insert) => (
            <button key={insert} className="chip" type="button" onClick={() => setNotes((current) => current.trim() ? `${current.trim()}\n${insert}` : insert)}>{insert}</button>
          ))}
        </div>
        <label>Notes
          <textarea rows={12} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <button className="btn primary" type="button" onClick={() => void save().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not save notes."))}>Save notes</button>
      </div>
    </aside>
  );
}
