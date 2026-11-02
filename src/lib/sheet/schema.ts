/**
 * Each dashboard tab that stores rows should add a sheet here.
 * `ensureDashboardSheets` creates any tab that is missing.
 */
export const dashboardSheetTabs = [
  { key: "tours", title: "Tours", kind: "tours" },
  { key: "noShowLog", title: "No Show Log", kind: "log" },
  { key: "print", title: "Print", kind: "print" },
] as const;

export type DashboardSheetKey = (typeof dashboardSheetTabs)[number]["key"];

export const TOUR_HEADERS = [
  "Registration ID",
  "OA Event ID",
  "Tour type",
  "Date",
  "Time",
  "End",
  "Students",
  "Grades",
  "OA Student IDs",
  "OA Status",
  "Registration state",
  "Host",
  "Campus",
  "Attendees",
  "Parent",
  "OA note",
  "Calendar event ID",
  "Calendar link",
  "Sync status",
  "No show",
  "Notes doc",
  "Grade of interest",
  "Lead source",
  "Interest level",
  "Concerns",
  "Next step",
  "Tour guide",
  "Comment",
  "Notes updated",
  "Profile URLs",
] as const;

export const LOG_HEADERS = [
  "Timestamp (ICT)",
  "Registration ID",
  "Students",
  "Action",
  "Actor",
  "Calendar event ID",
  "ISO time",
] as const;

export const PRINT_HEADERS = [
  "Date",
  "Time",
  "Students",
  "Grade",
  "Host",
  "OA status",
  "Registration",
  "Calendar",
  "No show",
  "Interest",
  "Lead source",
  "Next step",
  "Comment",
] as const;

/** Widths chosen so the Print tab fits a landscape A4 page before fit-to-width scaling. */
export const PRINT_COLUMN_WIDTHS = [100, 130, 210, 70, 120, 110, 100, 140, 72, 70, 140, 140, 180];
