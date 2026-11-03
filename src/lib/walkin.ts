import { NOTES_SECTION_END, NOTES_SECTION_START } from "@/lib/notes-format";
import { buildWalkInTitle, formatPersonName } from "@/lib/title";
import { tourInterval, tourTimeLabel } from "@/lib/time";
import type { CalendarEvent, NotesDoc, TourNotes, TourView } from "@/lib/types";
import { walkInFormFields } from "@/tabs/tours/walkinForm.config";

export type WalkInInput = Record<string, string>;

export type WalkInRecord = {
  id: number;
  createdAt: string;
  parentFirstName: string;
  parentLastName: string;
  email: string;
  phone: string;
  studentFirstName: string;
  studentPreferredName: string;
  studentLastName: string;
  dateOfBirth: string;
  gradeApplyingFor: string;
  intendedStartDate: string;
  hearAbout: string;
  notes: string;
  date: string;
  time: string;
  calendarEventId: string;
};

export function emptyWalkInInput(): WalkInInput {
  return Object.fromEntries(walkInFormFields.map((field) => [field.name, ""]));
}

export function parseWalkInFields(input: unknown): WalkInInput {
  if (!input || typeof input !== "object") {
    throw new Error("Walk-in details are missing.");
  }
  const source = input as Record<string, unknown>;
  const values: WalkInInput = {};
  for (const field of walkInFormFields) {
    const raw = source[field.name];
    const value = typeof raw === "string" ? raw.trim() : "";
    if (field.required && !value) throw new Error(`${field.label} is required.`);
    if (field.type === "select" && value && field.options && !field.options.includes(value)) {
      throw new Error(`${field.label} is not one of the listed choices.`);
    }
    if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new Error("Enter an email address.");
    }
    values[field.name] = value;
  }
  return values;
}

export function walkInRecordFromFields(values: WalkInInput, slot: { date: string; time: string }, id: number, calendarEventId: string): WalkInRecord {
  return {
    id,
    createdAt: new Date().toISOString(),
    parentFirstName: values.parentFirstName,
    parentLastName: values.parentLastName,
    email: values.email,
    phone: values.phone,
    studentFirstName: values.studentFirstName,
    studentPreferredName: values.studentPreferredName,
    studentLastName: values.studentLastName,
    dateOfBirth: values.dateOfBirth,
    gradeApplyingFor: values.gradeApplyingFor,
    intendedStartDate: values.intendedStartDate,
    hearAbout: values.hearAbout,
    notes: values.notes,
    date: slot.date,
    time: slot.time,
    calendarEventId,
  };
}

export function walkInTitleFor(record: Pick<WalkInRecord, "studentFirstName" | "studentPreferredName" | "studentLastName" | "gradeApplyingFor">): string {
  return buildWalkInTitle({
    firstName: record.studentFirstName,
    preferredName: record.studentPreferredName,
    lastName: record.studentLastName,
    grade: record.gradeApplyingFor,
  });
}

export function buildWalkInDescription(record: WalkInRecord): string {
  const student = formatPersonName({
    firstName: record.studentFirstName,
    lastName: record.studentLastName,
    preferredName: record.studentPreferredName,
  });
  const items = [
    ["Walk-in", ""],
    ["Parent", `${record.parentFirstName} ${record.parentLastName}`.trim()],
    ["Email", record.email],
    ["Phone", record.phone],
    ["Student", student],
    ["Date of birth", record.dateOfBirth],
    ["Grade applying for", record.gradeApplyingFor],
    ["Intended start", record.intendedStartDate],
    ["How they heard", record.hearAbout],
    ["Walk-in ID", String(record.id)],
  ];
  const list = items
    .filter(([, value]) => value || items[0][0] === "Walk-in")
    .map(([label, value]) => (value ? `<li><b>${label}:</b> ${escapeHtml(value)}</li>` : `<li><b>${label}</b></li>`))
    .join("");
  const base = `<ul>${list}</ul>`;
  if (!record.notes.trim()) return base;
  return `${base}${NOTES_SECTION_START}<h3>Notes</h3><ul><li>${escapeHtml(record.notes)}</li></ul>${NOTES_SECTION_END}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function walkInRecordToTour(
  record: WalkInRecord,
  event: CalendarEvent | null,
  notes: TourNotes | null,
  doc: NotesDoc | null,
  durationMinutes: number,
): TourView {
  const interval = tourInterval(record.date, record.time, durationMinutes);
  const labels = tourTimeLabel(record.date, record.time, durationMinutes);
  const student = {
    id: 0,
    firstName: record.studentFirstName,
    lastName: record.studentLastName,
    preferredName: record.studentPreferredName,
    grade: record.gradeApplyingFor,
    status: "Walk-in",
    thaiNickname: "",
    profileUrl: "",
  };
  const displayName = formatPersonName(student);
  return {
    registrationId: record.id,
    eventId: 0,
    eventLabel: "Walk-in",
    source: "Walk-in",
    inquirySource: record.hearAbout,
    date: record.date,
    time: record.time,
    endTime: labels.endTime,
    startIso: interval.start,
    endIso: interval.end,
    timeLabel: labels.label,
    students: [student],
    displayName,
    gradesLabel: record.gradeApplyingFor,
    statusLabel: "Walk-in",
    state: "scheduled",
    host: "Walk-in",
    campus: "Ratchapruek",
    note: [record.notes, record.dateOfBirth ? `Date of birth ${record.dateOfBirth}` : "", record.intendedStartDate ? `Intended start ${record.intendedStartDate}` : ""]
      .filter(Boolean)
      .join(" · "),
    attendeesCount: 2,
    parents: [
      {
        name: `${record.parentFirstName} ${record.parentLastName}`.trim(),
        email: record.email,
        phone: record.phone,
        role: "Parent",
      },
    ],
    syncStatus: event ? "synced" : "missing",
    noShow: false,
    pendingOaReminder: false,
    calendar: event
      ? {
          id: event.id,
          title: event.title,
          htmlLink: event.htmlLink,
          startIso: event.startIso,
          endIso: event.endIso,
          whenLabel: labels.label,
          description: event.description,
          notesDocUrl: event.notesDocUrl || doc?.url || "",
          notesDocName: doc?.name || "",
          notesDocBody: doc?.body || "",
        }
      : null,
    notes,
  };
}

export function nextWalkInId(existing: WalkInRecord[]): number {
  const max = existing.reduce((highest, record) => Math.max(highest, record.id), 99000);
  return max + 1;
}
