import { masterSheetColumns } from "@/lib/office/sheet-schema";
import { decodeSnapshot } from "@/lib/office/snapshot-json";
import type { OfficeChart, OfficeRow, OfficeSnapshot, OfficeTabId, OfficeTabPayload } from "@/lib/office/types";
import { withNoShowTag } from "@/lib/title";

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
  const columns = values[0].map((cell) => cell.trim());
  const rows: OfficeRow[] = values.slice(1).flatMap((raw, rowIndex) => {
    if (!raw.some((cell) => cell.trim())) return [];
    const cells: Record<string, string> = {};
    columns.forEach((column, columnIndex) => {
      if (column) cells[column] = (raw[columnIndex] ?? "").trim();
    });
    const year = Number(cells["Enrollment year"]);
    const grad = Number(cells["Graduating year"]);
    const badges: string[] = [];
    if (cells.Status === "LOA") badges.push("LOA");
    return [
      {
        id: cells["OA id"] || cells["Student ID"] || cells["Alumni ID"] || cells.Name || `${id}-${rowIndex + 2}`,
        enrollmentYear: Number.isFinite(year) ? year : undefined,
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
    reconciliation:
      id === "student-list"
        ? [{ label: "Rows", count: rows.length }, { label: "With a No.", count: rows.filter((row) => row.cells["No."]).length }]
        : undefined,
    mismatches:
      id === "student-list"
        ? rows
            .filter((row) => row.cells["No."] && !row.cells["OA id"])
            .map((row) => ({ name: row.cells.Name || "Unnamed", issue: "Active in Weena's sheet but no OA record" }))
        : undefined,
    note: id === "scholarships" ? "Loaded from the master sheet." : undefined,
  };
}

export function snapshotFromSheets(sheets: Record<string, string[][]>, generatedAt = new Date().toISOString()): OfficeSnapshot | null {
  const snapshotValues = sheets.Snapshot;
  if (snapshotValues) {
    const decoded = decodeSnapshot(snapshotValues);
    if (decoded) return decoded;
  }
  const tabs = {} as OfficeSnapshot["tabs"];
  let found = false;
  for (const [title, id] of Object.entries(titleToTab) as [string, OfficeTabId][]) {
    const payload = payloadFromTable(id, title, sheets[title] ?? []);
    if (payload && payload.rows.length) found = true;
    tabs[id] = payload ?? emptyPayload(id, title);
  }
  if (!found) return null;
  const logRows = sheets["Sync Log"]?.slice(1) ?? [];
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

function emptyPayload(id: OfficeTabId, title: string): OfficeTabPayload {
  const columns = [...(masterSheetColumns[title as keyof typeof masterSheetColumns] ?? [])];
  return { id, title, columns, rows: [], kpis: [], charts: [], gaps: [{ label: "No rows", detail: `${title} was not in the file.` }] };
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
