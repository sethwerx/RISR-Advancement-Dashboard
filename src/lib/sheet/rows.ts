import { attendanceLabel, normalizeAttendanceLabel } from "@/lib/attendance";
import { SYNC_LABEL, STATE_LABEL } from "@/lib/constants";
import { LOG_HEADERS, PRINT_HEADERS, TOUR_HEADERS } from "@/lib/sheet/schema";
import { formatIctTimestamp } from "@/lib/time";
import type { NoShowLogEntry, TourView } from "@/lib/types";

function concerns(tour: TourView): string {
  if (!tour.notes) return "";
  const items = [...tour.notes.concerns];
  if (tour.notes.concernOther) items.push(`Other: ${tour.notes.concernOther}`);
  return items.join("; ");
}

function parentCell(tour: TourView): string {
  return tour.parents
    .map((parent) => [parent.name, parent.role, parent.email, parent.phone].filter(Boolean).join(" · "))
    .join("\n");
}

export function tourSheetRows(tours: TourView[]): string[][] {
  const rows = tours.map((tour) => [
    String(tour.registrationId),
    String(tour.eventId),
    tour.eventLabel,
    tour.source,
    tour.date,
    tour.time,
    tour.endTime,
    tour.displayName,
    tour.gradesLabel,
    tour.students.map((student) => String(student.id)).join(", "),
    tour.statusLabel,
    STATE_LABEL[tour.state],
    tour.host,
    tour.campus,
    String(tour.attendeesCount),
    parentCell(tour),
    tour.note,
    tour.calendar?.id ?? "",
    tour.calendar?.htmlLink ?? "",
    SYNC_LABEL[tour.syncStatus],
    normalizeAttendanceLabel(attendanceLabel(tour)),
    tour.calendar?.notesDocUrl ?? "",
    tour.notes?.gradeOfInterest ?? "",
    tour.notes?.leadSource || tour.inquirySource || "",
    tour.notes ? String(tour.notes.interestLevel) : "",
    concerns(tour),
    tour.notes?.nextStep ?? "",
    tour.notes?.tourGuide ?? "",
    tour.notes?.comment ?? "",
    tour.notes?.updatedAt ?? "",
    tour.students.map((student) => student.profileUrl).join("\n"),
  ]);
  return [[...TOUR_HEADERS], ...rows];
}

export function logSheetRows(log: NoShowLogEntry[]): string[][] {
  const sorted = log.slice().sort((a, b) => a.at.localeCompare(b.at));
  const rows = sorted.map((entry) => [
    formatIctTimestamp(entry.at),
    String(entry.registrationId),
    entry.studentNames,
    entry.action,
    entry.actor,
    entry.calendarEventId,
    entry.at,
  ]);
  return [[...LOG_HEADERS], ...rows];
}

export function printSheetRows(tours: TourView[]): string[][] {
  const sorted = tours.slice().sort((a, b) => a.startIso.localeCompare(b.startIso) || a.displayName.localeCompare(b.displayName));
  const rows = sorted.map((tour) => [
    tour.date,
    tour.timeLabel,
    tour.displayName,
    tour.gradesLabel,
    tour.host,
    tour.statusLabel,
    STATE_LABEL[tour.state],
    SYNC_LABEL[tour.syncStatus],
    normalizeAttendanceLabel(attendanceLabel(tour)),
    tour.notes ? String(tour.notes.interestLevel) : "",
    tour.notes?.leadSource || tour.inquirySource || "",
    tour.notes?.nextStep ?? "",
    tour.notes?.comment ?? "",
  ]);
  return [[...PRINT_HEADERS], ...rows];
}
