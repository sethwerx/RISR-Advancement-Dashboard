import { STATE_LABEL, SYNC_LABEL, representativeStatus } from "@/lib/constants";
import { matchRegistrations } from "@/lib/match";
import { formatPersonName, isNoShowTitle } from "@/lib/title";
import { formatWhenFromIso, tourInterval, tourTimeLabel } from "@/lib/time";
import type {
  CalendarEvent,
  HydratedRegistration,
  NoShowLogEntry,
  NotesDoc,
  TourNotes,
  TourView,
} from "@/lib/types";

export function pendingReminder(log: NoShowLogEntry[], registrationId: number): boolean {
  const rows = log
    .filter((entry) => entry.registrationId === registrationId)
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at));
  let pending = false;
  for (const row of rows) {
    if (row.action === "No Show") pending = true;
    if (row.action === "OA updated" || row.action === "Undo") pending = false;
  }
  return pending;
}

export function buildTourViews(
  registrations: HydratedRegistration[],
  events: CalendarEvent[],
  notes: TourNotes[],
  log: NoShowLogEntry[],
  docs: Record<string, NotesDoc>,
  durationMinutes: number,
): TourView[] {
  const notesById = new Map(notes.map((note) => [note.registrationId, note]));
  const matches = matchRegistrations(registrations, events, durationMinutes);
  return matches.map((match) => {
    const registration = match.registration;
    const interval = tourInterval(registration.date, registration.time, durationMinutes);
    const labels = tourTimeLabel(registration.date, registration.time, durationMinutes);
    const displayName = registration.students.map(formatPersonName).join(" & ") || "Unnamed student";
    const grades = registration.students.map((student) => student.grade).filter(Boolean);
    const statuses = [...new Set(registration.students.map((student) => student.status).filter(Boolean))];
    const doc = docs[String(registration.id)];
    const event = match.event;
    return {
      registrationId: registration.id,
      eventId: registration.eventId,
      eventLabel: registration.eventLabel,
      date: registration.date,
      time: registration.time,
      endTime: labels.endTime,
      startIso: interval.start,
      endIso: interval.end,
      timeLabel: labels.label,
      students: registration.students,
      displayName,
      gradesLabel: grades.join(", "),
      statusLabel: statuses.join(" · "),
      state: registration.state,
      host: registration.host,
      campus: registration.campus,
      note: registration.note,
      attendeesCount: registration.attendeesCount,
      parents: registration.parents,
      source: "OpenApply",
      inquirySource: "",
      syncStatus: match.status,
      noShow: event ? isNoShowTitle(event.title) : false,
      pendingOaReminder: pendingReminder(log, registration.id),
      calendar: event
        ? {
            id: event.id,
            title: event.title,
            htmlLink: event.htmlLink,
            startIso: event.startIso,
            endIso: event.endIso,
          whenLabel: formatWhenFromIso(event.startIso),
          description: event.description,
          notesDocUrl: event.notesDocUrl || doc?.url || "",
            notesDocName: doc?.name || "",
            notesDocBody: doc?.body || "",
          }
        : null,
      notes: notesById.get(registration.id) ?? null,
    };
  });
}

export function syncStatusLabel(tour: TourView): string {
  return SYNC_LABEL[tour.syncStatus];
}

export function stateLabel(tour: TourView): string {
  return STATE_LABEL[tour.state];
}

export function representativeTourStatus(tour: TourView): string {
  return representativeStatus(tour.students.map((student) => student.status));
}
