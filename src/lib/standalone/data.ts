import { masterSheetColumns } from "@/lib/office/sheet-schema";
import { fictionalSnapshot } from "@/lib/office/sample";
import { decodeSnapshot } from "@/lib/office/snapshot-json";
import type { OfficeChart, OfficeKpi, OfficeRow, OfficeSnapshot, OfficeTabId, OfficeTabPayload } from "@/lib/office/types";
import { withNoShowTag } from "@/lib/title";
import {
  currentStudentListYear,
  emptyStudentListsByYear,
  type StudentListByYear,
} from "@/lib/standalone/student-years";
import {
  currentSchoolYear,
  emptyYearArchives,
  emptyYearMap,
  yearTabNames,
  yearTabSections,
  type SchoolYear,
  type YearArchives,
  type YearTabId,
} from "@/lib/standalone/school-years";
import { alumniSheetTitles } from "@/lib/standalone/alumni-classes";
import { emptyScheduleBundle, readScheduleBundle, type ScheduleBundle } from "@/lib/standalone/schedule";

export type LocalTour = {
  id: string;
  date: string;
  time: string;
  students: string;
  grade: string;
  host: string;
  status: string;
  attendance: string;
  calendarEventId: string;
  title: string;
  note: string;
};

const titleToTab: Record<string, OfficeTabId> = {
  Applicants: "applicants",
  Assessments: "assessments",
  Admitted: "admitted",
  "Canceled/Declined": "canceled-declined",
  Offers: "offers",
  "Student List": "student-list",
  Withdrawals: "withdrawals",
  Alumni: "alumni",
  Scholarships: "scholarships",
};

const chartColumn: Partial<Record<OfficeTabId, string>> = {
  applicants: "Stage",
  assessments: "Status",
  admitted: "Stage",
  "canceled-declined": "Outcome",
  offers: "Outcome",
  "student-list": "Status",
  withdrawals: "Category",
  alumni: "Graduating year",
  scholarships: "Category",
};

export function sampleTours(): LocalTour[] {
  return [
    {
      id: "88001",
      date: "2026-11-12",
      time: "10:00 AM",
      students: "Kiran Desai",
      grade: "G5",
      host: "Riley Quinn",
      status: "Scheduled",
      attendance: "",
      calendarEventId: "",
      title: "Tour (OA) - Kiran Desai (G5)",
      note: "",
    },
    {
      id: "88002",
      date: "2026-11-06",
      time: "8:00 AM",
      students: "Lina Moreau",
      grade: "G1",
      host: "Alex Morgan",
      status: "Scheduled",
      attendance: "Attended",
      calendarEventId: "",
      title: "Tour (OA) - Lina Moreau (G1)",
      note: "",
    },
    {
      id: "88003",
      date: "2026-10-22",
      time: "10:00 AM",
      students: "Owen Hart",
      grade: "G9",
      host: "Samira Nunez",
      status: "Scheduled",
      attendance: "No show",
      calendarEventId: "",
      title: "Tour (OA) [No Show] - Owen Hart (G9)",
      note: "",
    },
  ];
}

/** Prefer Seth's tab name `Tours/Visits`, then `Tours`. */
export function tourRowsFromSheets(sheets: Record<string, string[][]>): LocalTour[] {
  const preferred = sheets["Tours/Visits"];
  const values = preferred && preferred.length > 1 ? preferred : sheets.Tours ?? preferred ?? [];
  return toursFromSheet(values);
}

export function toursFromSheet(values: string[][]): LocalTour[] {
  if (values.length < 2) return [];
  const header = values[0].map((cell) => cell.trim());
  const index = (name: string) => header.indexOf(name);
  return values.slice(1).flatMap((row, rowIndex) => {
    const cell = (name: string) => (index(name) >= 0 ? (row[index(name)] ?? "").trim() : "");
    const students = cell("Students");
    if (!students) return [];
    return [
      {
        id: cell("Registration ID") || `row-${rowIndex + 2}`,
        date: cell("Date"),
        time: cell("Time"),
        students,
        grade: cell("Grades"),
        host: cell("Host"),
        status: cell("Registration state") || cell("OA Status"),
        attendance: cell("Attendance"),
        calendarEventId: cell("Calendar event ID"),
        title: students,
        note: cell("Comment") || cell("OA note"),
      },
    ];
  });
}

/** First paint, before a school account reads the master sheet. */
export const signInStudentListMessage = "Sign in with @risr.ac.th to load school data";

/** Explicit demo only. These rows are the fictional sample, never the Weena roster. */
export const demoStudentListBanner = "Demo data — not the school roster. These names are fictional.";

export type DatasetOrigin = "empty" | "demo" | "file" | "sheet";

export type OfficeSession = {
  snapshot: OfficeSnapshot;
  tours: LocalTour[];
  studentListOrigin: DatasetOrigin;
  toursOrigin: DatasetOrigin;
  studentListLoadedAt: string | null;
  studentListsByYear: StudentListByYear;
  yearArchives: YearArchives;
  schedule: ScheduleBundle;
};

export type MasterLoad = {
  snapshot: OfficeSnapshot | null;
  tours: LocalTour[];
  studentListFromSheet: boolean;
  studentListError?: string;
  studentListsByYear?: StudentListByYear;
  yearArchives?: YearArchives;
  schedule?: ScheduleBundle;
};

const fictionalStudentNames = ["Ben Rahman", "Chloe Nguyen", "Isla Rahman", "Yusuf Demir"];

/** The four-name sample roster must never be treated as the school. */
export function isFictionalStudentRoster(rows: { cells: Record<string, string> }[]): boolean {
  const names = rows.map((row) => (row.cells.Name ?? "").trim()).filter(Boolean).sort();
  return names.length > 0 && names.length <= fictionalStudentNames.length && names.every((name) => fictionalStudentNames.includes(name));
}

export function studentListReadError(status: number, body = ""): string {
  const detail = body.replace(/\s+/g, " ").trim().slice(0, 240);
  return detail ? `Could not read “Student List” (HTTP ${status}). ${detail}` : `Could not read “Student List” (HTTP ${status}).`;
}

function snapshotIsSample(snapshot: OfficeSnapshot): boolean {
  if (snapshot.mock) return true;
  if (snapshot.syncLog.some((entry) => entry.mode === "sample" || /fictional sample/i.test(entry.note))) return true;
  return isFictionalStudentRoster(snapshot.tabs["student-list"]?.rows ?? []);
}

export function studentListSourceLabel(origin: DatasetOrigin): string {
  if (origin === "sheet") return "Master sheet";
  if (origin === "file") return "Loaded file";
  if (origin === "demo") return "Demo";
  return "Not loaded";
}

export function formatLoadedAt(value: string | null): string {
  if (!value) return "Not loaded";
  return value.replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

/** Show demo rows only in demo mode, and never show leftover names while the roster is not loaded. */
export function presentStudentList(payload: OfficeTabPayload, origin: DatasetOrigin): OfficeTabPayload {
  if (origin === "demo") {
    const rows = payload.rows.map((row) => ({
      ...row,
      badges: row.badges.includes("Demo") ? row.badges : ["Demo", ...row.badges],
    }));
    return {
      ...payload,
      rows,
      kpis: [{ id: "demo", label: `Demo (${rows.length})`, value: String(rows.length), chartId: "by-grade" }],
      charts: [],
      gaps: [],
      reconciliation: undefined,
      mismatches: [],
      note: demoStudentListBanner,
    };
  }
  if (origin === "empty" || ((origin === "sheet" || origin === "file") && isFictionalStudentRoster(payload.rows))) {
    return {
      ...payload,
      rows: [],
      kpis: [{ id: "rows", label: "Rows", value: "0", chartId: "by-grade" }],
      charts: [],
      gaps: [],
      reconciliation: undefined,
      mismatches: [],
      note: signInStudentListMessage,
    };
  }
  return payload;
}

const studentListHeaderAliases: Record<string, string> = {
  no: "No.",
  "no.": "No.",
  number: "No.",
  "student id": "Student ID",
  "id no": "Student ID",
  "id no.": "Student ID",
  "id number": "Student ID",
  "oa id": "OA id",
  "openapply id": "OA id",
  name: "Name",
  "student name": "Name",
  grade: "Grade",
  "grade level": "Grade",
  homeroom: "Homeroom",
  gender: "Gender",
  nationality: "Nationality",
  dob: "DOB",
  "date of birth": "DOB",
  "birth date": "DOB",
  "start date": "Start date",
  status: "Status",
  scholarship: "Scholarship",
  sibling: "Sibling",
};

function canonicalHeader(id: OfficeTabId, header: string): string {
  const trimmed = header.trim();
  if (id !== "student-list") return trimmed;
  return studentListHeaderAliases[trimmed.toLowerCase().replace(/\s+/g, " ")] ?? trimmed;
}

function sheetByTitle(sheets: Record<string, string[][]>, title: string): string[][] {
  const direct = sheets[title];
  if (direct && direct.length) return direct;
  const key = Object.keys(sheets).find((name) => name.trim().toLowerCase() === title.trim().toLowerCase());
  return key ? sheets[key] ?? [] : [];
}

function tableHasData(values: string[][]): boolean {
  return values.length > 1 && values.slice(1).some((row) => row.some((cell) => cell?.trim()));
}

/** Current year sheet: the plain tab when it has rows, otherwise the optional "Title 2026-2027" alias. */
export function currentYearValues(sheets: Record<string, string[][]>, currentTitle: string): string[][] {
  const named = yearTabNames(currentTitle, currentSchoolYear).map((title) => sheetByTitle(sheets, title));
  return named.find(tableHasData) ?? named.find((values) => sheetHasTable(values)) ?? [];
}

/** Current roster: "Student List" when it has rows, otherwise the optional "Student List 2026-2027" alias. */
export function currentStudentListValues(sheets: Record<string, string[][]>): string[][] {
  return currentYearValues(sheets, "Student List");
}

/** Alumni class tabs share one header. `Alumni` is Class of 2026. `Alumni 2027` and later append under it. */
export function mergedAlumniValues(sheets: Record<string, string[][]>): string[][] {
  const tables = alumniSheetTitles().map((title) => sheetByTitle(sheets, title)).filter((values) => sheetHasTable(values));
  if (!tables.length) return [];
  const header = tables[0][0];
  return [header, ...tables.flatMap((table) => table.slice(1))];
}

function sectionForYear(sheets: Record<string, string[][]>, id: YearTabId, currentTitle: string, year: SchoolYear): OfficeTabPayload | null {
  const values = year === currentSchoolYear ? currentYearValues(sheets, currentTitle) : sheetByTitle(sheets, yearTabNames(currentTitle, year)[0]);
  if (!tableHasData(values)) return null;
  const payload = payloadFromTable(id, year === currentSchoolYear ? currentTitle : `${currentTitle} ${year}`, values);
  if (!payload || !payload.rows.length) return null;
  if (year === currentSchoolYear) return payload;
  return { ...payload, mismatches: undefined, reconciliation: undefined };
}

export function readYearArchives(sheets: Record<string, string[][]>): YearArchives {
  const archives = emptyYearArchives();
  for (const section of yearTabSections) {
    const lists = emptyYearMap();
    for (const year of Object.keys(lists) as SchoolYear[]) lists[year] = sectionForYear(sheets, section.id, section.currentTitle, year);
    archives[section.id] = lists;
  }
  return archives;
}

export function readStudentListsByYear(sheets: Record<string, string[][]>): StudentListByYear {
  return readYearArchives(sheets)["student-list"];
}

/** Student List has no enrollment-year column. A Start date must not become one. */
function enrollmentYearFromCells(id: OfficeTabId, cells: Record<string, string>): number | undefined {
  if (id === "student-list") return undefined;
  const yearText = (cells["Enrollment year"] ?? "").trim();
  if (!/^\d{4}$/.test(yearText)) return undefined;
  const year = Number(yearText);
  return year >= 2000 && year <= 2100 ? year : undefined;
}

function studentListKpis(rows: OfficeRow[]): { kpis: OfficeKpi[]; charts: OfficeChart[] } {
  const active = rows.filter((row) => (row.cells["No."] ?? "").trim()).length;
  return {
    kpis: [
      { id: "active", label: "Active (has No.)", value: String(active), chartId: "by-grade" },
      { id: "rows", label: "Rows", value: String(rows.length), chartId: "by-grade" },
      { id: "loa", label: "LOA", value: String(rows.filter((row) => row.cells.Status === "LOA" || row.badges.includes("LOA")).length), chartId: "by-status" },
    ],
    charts: [
      { id: "by-grade", title: "Headcount by grade", points: countColumn(rows, "Grade") },
      { id: "by-status", title: "Status", points: countColumn(rows, "Status") },
    ],
  };
}

function countColumn(rows: OfficeRow[], column: string): OfficeChart["points"] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const label = row.cells[column] || "Not recorded";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, value]) => ({ label, value }));
}

export function payloadFromTable(id: OfficeTabId, title: string, values: string[][]): OfficeTabPayload | null {
  if (!values.length || !values[0].some((cell) => cell.trim())) return null;
  const rawHeaders = values[0].map((cell) => cell.trim());
  const columns =
    id === "student-list"
      ? [
          ...masterSheetColumns["Student List"],
          ...rawHeaders
            .map((header) => canonicalHeader(id, header))
            .filter((header) => header && !masterSheetColumns["Student List"].includes(header as (typeof masterSheetColumns)["Student List"][number])),
        ]
      : rawHeaders.filter(Boolean);
  const rows: OfficeRow[] = values.slice(1).flatMap((raw, rowIndex) => {
    if (!raw.some((cell) => cell?.trim())) return [];
    const cells: Record<string, string> = {};
    rawHeaders.forEach((column, columnIndex) => {
      const name = canonicalHeader(id, column);
      if (!name) return;
      const value = (raw[columnIndex] ?? "").trim();
      if (!cells[name]) cells[name] = value;
    });
    const gradText = (cells["Graduating year"] ?? "").trim();
    const grad = /^\d{4}$/.test(gradText) ? Number(gradText) : Number.NaN;
    const badges: string[] = [];
    if (cells.Status === "LOA") badges.push("LOA");
    return [
      {
        id: `${id}-${rowIndex + 2}-${cells["Student ID"] || cells["OA id"] || cells.Name || "row"}`,
        enrollmentYear: enrollmentYearFromCells(id, cells),
        oaStatus: cells.Stage === "Pending" ? "pending" : cells.Stage === "Applicant" ? "applied" : undefined,
        gradYear: Number.isFinite(grad) ? grad : undefined,
        cells,
        detail: Object.entries(cells)
          .filter(([, value]) => value)
          .map(([label, value]) => ({ label, value })),
        badges,
      },
    ];
  });
  if (id === "student-list") {
    const shaped = studentListKpis(rows);
    return {
      id,
      title,
      columns,
      rows,
      kpis: shaped.kpis,
      charts: shaped.charts,
      gaps: rows.length ? [] : [{ label: "Empty tab", detail: `${title} has headers and no data rows.` }],
      reconciliation: [
        { label: "Weena (has No.)", count: rows.filter((row) => (row.cells["No."] ?? "").trim()).length },
        { label: "Rows", count: rows.length },
      ],
      mismatches: rows
        .filter((row) => (row.cells["No."] ?? "").trim() && !(row.cells["OA id"] ?? "").trim())
        .map((row) => ({ name: row.cells.Name || "Unnamed", issue: "Active in Weena's sheet but no OA record" })),
    };
  }
  const category = chartColumn[id] && columns.includes(chartColumn[id]!) ? chartColumn[id]! : columns[0];
  const points = countColumn(rows, category);
  return {
    id,
    title,
    columns,
    rows,
    kpis: [
      { id: "rows", label: "Rows", value: String(rows.length), chartId: "mix" },
      { id: "mix", label: category, value: String(points.length), chartId: "mix" },
    ],
    charts: [{ id: "mix", title: `${title} by ${category}`, points }],
    gaps: rows.length ? [] : [{ label: "Empty tab", detail: `${title} has headers and no data rows.` }],
    note: id === "scholarships" ? "Loaded from the master sheet." : undefined,
  };
}

function sheetHasTable(values: string[][]): boolean {
  return values.length > 0 && values[0].some((cell) => cell.trim());
}

function emptyPayload(id: OfficeTabId, title: string): OfficeTabPayload {
  const columns = [...(masterSheetColumns[title as keyof typeof masterSheetColumns] ?? [])];
  return { id, title, columns, rows: [], kpis: [], charts: [], gaps: [{ label: "No rows", detail: `${title} was not in the file.` }] };
}

export function emptyOfficeSnapshot(generatedAt = ""): OfficeSnapshot {
  const tabs = {} as OfficeSnapshot["tabs"];
  for (const [title, id] of Object.entries(titleToTab) as [string, OfficeTabId][]) {
    tabs[id] = emptyPayload(id, title);
  }
  return { generatedAt, mock: false, tabs, syncLog: [] };
}

/** Opens with no roster and no sample tours. Demo is a separate, labeled action. */
export function initialOfficeSession(): OfficeSession {
  return {
    snapshot: emptyOfficeSnapshot(),
    tours: [],
    studentListOrigin: "empty",
    toursOrigin: "empty",
    studentListLoadedAt: null,
    studentListsByYear: emptyStudentListsByYear(),
    yearArchives: emptyYearArchives(),
    schedule: emptyScheduleBundle(),
  };
}

export function demoOfficeSession(at?: string): OfficeSession {
  return {
    snapshot: fictionalSnapshot(at),
    tours: sampleTours(),
    studentListOrigin: "demo",
    toursOrigin: "demo",
    studentListLoadedAt: null,
    studentListsByYear: emptyStudentListsByYear(),
    yearArchives: emptyYearArchives(),
    schedule: emptyScheduleBundle(),
  };
}

/**
 * Student List comes only from that sheet tab.
 * A Snapshot JSON blob, including the fictional sample, never becomes the roster.
 */
export function snapshotFromSheets(sheets: Record<string, string[][]>, generatedAt = new Date().toISOString()): OfficeSnapshot | null {
  const studentValues = currentStudentListValues(sheets);
  const studentFromSheet = sheetHasTable(studentValues);
  const studentPayload = studentFromSheet
    ? payloadFromTable("student-list", "Student List", studentValues) ?? emptyPayload("student-list", "Student List")
    : emptyPayload("student-list", "Student List");
  const currentBySection = new Map<OfficeTabId, OfficeTabPayload>();
  for (const section of yearTabSections) {
    if (section.id === "student-list") {
      currentBySection.set(section.id, studentPayload);
      continue;
    }
    const values = currentYearValues(sheets, section.currentTitle);
    currentBySection.set(
      section.id,
      sheetHasTable(values) ? payloadFromTable(section.id, section.currentTitle, values) ?? emptyPayload(section.id, section.currentTitle) : emptyPayload(section.id, section.currentTitle),
    );
  }
  const alumniValues = mergedAlumniValues(sheets);
  const alumniFromSheet = sheetHasTable(alumniValues);
  const alumniPayload = alumniFromSheet
    ? payloadFromTable("alumni", "Alumni", alumniValues) ?? emptyPayload("alumni", "Alumni")
    : null;
  const decoded = decodeSnapshot(sheetByTitle(sheets, "Snapshot"));
  if (decoded && !snapshotIsSample(decoded)) {
    for (const [id, payload] of currentBySection) decoded.tabs[id] = payload;
    if (alumniPayload) decoded.tabs.alumni = alumniPayload;
    return decoded;
  }
  const tabs = {} as OfficeSnapshot["tabs"];
  let found = false;
  for (const [title, id] of Object.entries(titleToTab) as [string, OfficeTabId][]) {
    const current = currentBySection.get(id);
    if (current) {
      tabs[id] = current;
      if (current.rows.length) found = true;
      continue;
    }
    if (id === "alumni" && alumniPayload) {
      tabs[id] = alumniPayload;
      if (alumniPayload.rows.length) found = true;
      continue;
    }
    const payload = payloadFromTable(id, title, sheetByTitle(sheets, title));
    if (payload && payload.rows.length) found = true;
    tabs[id] = payload ?? emptyPayload(id, title);
  }
  if (!found && !studentFromSheet) return null;
  const logRows = sheetByTitle(sheets, "Sync Log").slice(1);
  return {
    generatedAt,
    mock: false,
    tabs,
    syncLog: logRows.map((row) => ({
      at: row[0] ?? "",
      scope: row[1] ?? "",
      rows: Number(row[2] ?? 0),
      mode: row[3] === "live" ? "live" : "sample",
      note: row[4] ?? "",
    })),
  };
}

export function readMasterSheets(sheets: Record<string, string[][]>, generatedAt = new Date().toISOString()): MasterLoad {
  const yearArchives = readYearArchives(sheets);
  const snapshot = snapshotFromSheets(sheets, generatedAt);
  if (snapshot?.tabs["student-list"]?.rows.length) yearArchives["student-list"][currentSchoolYear] = snapshot.tabs["student-list"];
  if (snapshot?.tabs.withdrawals?.rows.length) yearArchives.withdrawals[currentSchoolYear] = snapshot.tabs.withdrawals;
  return {
    snapshot,
    tours: tourRowsFromSheets(sheets),
    studentListFromSheet: sheetHasTable(currentStudentListValues(sheets)),
    studentListsByYear: yearArchives["student-list"],
    yearArchives,
    schedule: readScheduleBundle(sheets),
  };
}

/**
 * Mark Student List live only when that tab was actually read.
 * Tours-only success must not keep fictional students or label them as the master sheet.
 * A failed reload keeps the last live roster. It never substitutes the demo names.
 */
export function applyMasterLoad(
  current: OfficeSession,
  loaded: MasterLoad,
  at: string,
  origin: "sheet" | "file" = "sheet",
): { session: OfficeSession; error: string } {
  const next: OfficeSession = {
    snapshot: current.snapshot,
    tours: current.tours,
    studentListOrigin: current.studentListOrigin,
    toursOrigin: current.toursOrigin,
    studentListLoadedAt: current.studentListLoadedAt,
    studentListsByYear: current.studentListsByYear,
    yearArchives: current.yearArchives,
    schedule: current.schedule,
  };
  if (loaded.schedule) next.schedule = loaded.schedule;
  if (loaded.tours.length) {
    next.tours = loaded.tours;
    next.toursOrigin = origin;
  }
  const incoming = loaded.snapshot && !snapshotIsSample(loaded.snapshot) ? loaded.snapshot : null;
  const sheetRows = incoming?.tabs["student-list"]?.rows ?? [];
  if (loaded.studentListFromSheet && incoming?.tabs["student-list"] && !isFictionalStudentRoster(sheetRows)) {
    next.snapshot = incoming;
    next.studentListOrigin = origin;
    next.studentListLoadedAt = at;
    const archives = loaded.yearArchives ?? emptyYearArchives();
    archives["student-list"] = { ...(loaded.studentListsByYear ?? archives["student-list"]), [currentStudentListYear]: incoming.tabs["student-list"] };
    if (incoming.tabs.withdrawals?.rows.length) archives.withdrawals = { ...archives.withdrawals, [currentSchoolYear]: incoming.tabs.withdrawals };
    next.yearArchives = archives;
    next.studentListsByYear = archives["student-list"];
    return { session: next, error: "" };
  }
  const error = loaded.studentListError || (isFictionalStudentRoster(sheetRows)
    ? "Student List did not load from the master sheet. The fictional sample (Yusuf Demir, Chloe Nguyen, Isla Rahman, Ben Rahman) was not kept."
    : "Student List did not load from the master sheet.");
  if (current.studentListOrigin === "sheet" || current.studentListOrigin === "file") {
    if (incoming) {
      next.snapshot = {
        ...incoming,
        tabs: { ...incoming.tabs, "student-list": current.snapshot.tabs["student-list"] },
      };
    }
    return { session: next, error };
  }
  const blank = emptyOfficeSnapshot(at).tabs["student-list"];
  next.snapshot = incoming
    ? { ...incoming, tabs: { ...incoming.tabs, "student-list": blank } }
    : emptyOfficeSnapshot(at);
  next.studentListOrigin = "empty";
  next.studentListLoadedAt = null;
  next.studentListsByYear = emptyStudentListsByYear();
  next.yearArchives = emptyYearArchives();
  if (!loaded.tours.length) {
    next.tours = [];
    next.toursOrigin = "empty";
  }
  return { session: next, error };
}

export function walkInEventBody(input: { summary: string; description: string; start: string; end: string }) {
  return {
    summary: input.summary,
    description: input.description,
    start: { dateTime: input.start, timeZone: "Asia/Bangkok" },
    end: { dateTime: input.end, timeZone: "Asia/Bangkok" },
  };
}

export function noShowPatch(title: string) {
  return { summary: withNoShowTag(title) };
}

export function notesPatch(notes: string) {
  return { description: notes };
}

export function calendarWriteQuery(): string {
  return "sendUpdates=none";
}
