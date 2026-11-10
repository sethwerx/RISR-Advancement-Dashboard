import { NOTES_SECTION_END, NOTES_SECTION_START } from "@/lib/notes-format";
import { buildWalkInTitle, formatPersonName } from "@/lib/title";
import { parseClock, tourInterval, tourTimeLabel } from "@/lib/time";
import type { CalendarEvent, NotesDoc, TourNotes, TourView } from "@/lib/types";
import { walkInBindings, walkInDurationMinutes, walkInFormFields } from "@/tabs/tours/walkinForm.config";

export type WalkInInput = Record<string, string>;

export type WalkInRecord = {
  id: number;
  createdAt: string;
  values: WalkInInput;
  date: string;
  time: string;
  calendarEventId: string;
  eventId: number;
  eventLabel: string;
  studentFirstName: string;
  studentPreferredName: string;
  studentLastName: string;
  gradeApplyingFor: string;
  dateOfBirth: string;
  intendedStart: string;
  hearAbout: string;
  notes: string;
  parentFirstName: string;
  parentLastName: string;
  email: string;
  phone: string;
  parentRole: string;
  host: string;
  campus: string;
  attendeesCount: number;
};

export function emptyWalkInInput(): WalkInInput {
  return Object.fromEntries(walkInFormFields.map((field) => [field.name, ""]));
}

function readRaw(raw: unknown): string {
  if (Array.isArray(raw)) return raw.map((item) => String(item).trim()).filter(Boolean).join("; ");
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  if (typeof raw === "string") return raw.trim();
  return "";
}

export function parseWalkInFields(input: unknown): WalkInInput {
  if (!input || typeof input !== "object") {
    throw new Error("Walk-in details are missing.");
  }
  const source = input as Record<string, unknown>;
  const values: WalkInInput = {};
  for (const field of walkInFormFields) {
    const value = readRaw(source[field.name]);
    const choices = field.options ?? [];
    if (field.type === "multiselect") {
      const selected = value.split(";").map((item) => item.trim()).filter(Boolean);
      if (field.required && selected.length === 0) throw new Error(`${field.label} is required.`);
      if (choices.length > 0 && selected.some((item) => !choices.includes(item))) {
        throw new Error(`${field.label} is not one of the listed choices.`);
      }
      values[field.name] = selected.join("; ");
      continue;
    }
    if (field.required && !value) throw new Error(`${field.label} is required.`);
    if (field.type === "select" && value && choices.length > 0 && !choices.includes(value)) {
      throw new Error(`${field.label} is not one of the listed choices.`);
    }
    if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new Error("Enter an email address.");
    }
    if (field.type === "number" && value && !/^\d+$/.test(value)) {
      throw new Error(`${field.label} must be a whole number.`);
    }
    if (field.name === walkInBindings.time && value) parseClock(value);
    values[field.name] = value;
  }
  return values;
}

function eventParts(value: string): { id: number; label: string } {
  const match = value.match(/^(\d+)\s*(.*)$/);
  if (!match) return { id: 0, label: value || "Walk-in" };
  return { id: Number(match[1]), label: match[2].trim() || "Walk-in" };
}

export function walkInRecordFromFields(values: WalkInInput, id: number, calendarEventId: string): WalkInRecord {
  const event = eventParts(values[walkInBindings.eventId] ?? "");
  const enrollment = [values["student.enrollment_year"], values["student.custom_fields.enrollment_month"]].filter(Boolean).join(" ");
  return {
    id,
    createdAt: new Date().toISOString(),
    values,
    date: values[walkInBindings.date] ?? "",
    time: values[walkInBindings.time] ?? "",
    calendarEventId,
    eventId: event.id,
    eventLabel: event.label,
    studentFirstName: values[walkInBindings.studentFirstName] ?? "",
    studentPreferredName: values[walkInBindings.studentNickname] ?? "",
    studentLastName: values[walkInBindings.studentLastName] ?? "",
    gradeApplyingFor: values[walkInBindings.grade] ?? "",
    dateOfBirth: values[walkInBindings.birthDate] ?? "",
    intendedStart: enrollment,
    hearAbout: values[walkInBindings.hearAbout] ?? "",
    notes: values[walkInBindings.note] ?? "",
    parentFirstName: values[walkInBindings.parentFirstName] ?? "",
    parentLastName: values[walkInBindings.parentLastName] ?? "",
    email: values[walkInBindings.email] ?? "",
    phone: values[walkInBindings.phone] ?? "",
    parentRole: values[walkInBindings.parentRole] ?? "Parent",
    host: values[walkInBindings.host]?.trim() || "Walk-in",
    campus: values[walkInBindings.campus] ?? "",
    attendeesCount: Number(values[walkInBindings.attendees] ?? "0") || 0,
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
  const items = walkInFormFields
    .map((field) => [field.label, record.values[field.name] ?? ""] as const)
    .filter(([, value]) => value.trim());
  const list = [
    `<li><b>Source:</b> Walk-in</li>`,
    ...items.map(([label, value]) => `<li><b>${escapeHtml(label)}:</b> ${escapeHtml(value)}</li>`),
    `<li><b>Walk-in ID:</b> ${record.id}</li>`,
  ].join("");
  const base = `<ul>${list}</ul>`;
  if (!record.notes.trim()) return base;
  return `${base}${NOTES_SECTION_START}<h3>Notes</h3><ul><li>${escapeHtml(record.notes)}</li></ul>${NOTES_SECTION_END}`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function walkInRecordToTour(
  record: WalkInRecord,
  event: CalendarEvent | null,
  notes: TourNotes | null,
  doc: NotesDoc | null,
  durationMinutes = walkInDurationMinutes,
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
    thaiNickname: record.studentPreferredName,
    profileUrl: "",
  };
  return {
    registrationId: record.id,
    eventId: record.eventId,
    eventLabel: record.eventLabel || "Walk-in",
    source: "Walk-in",
    inquirySource: record.hearAbout,
    date: record.date,
    time: record.time,
    endTime: labels.endTime,
    startIso: interval.start,
    endIso: interval.end,
    timeLabel: labels.label,
    students: [student],
    displayName: formatPersonName(student),
    gradesLabel: record.gradeApplyingFor,
    statusLabel: "Walk-in",
    state: "scheduled",
    host: record.host,
    campus: record.campus,
    note: record.notes,
    attendeesCount: record.attendeesCount,
    parents: [
      {
        name: `${record.parentFirstName} ${record.parentLastName}`.trim(),
        email: record.email,
        phone: record.phone,
        role: record.parentRole || "Parent",
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
