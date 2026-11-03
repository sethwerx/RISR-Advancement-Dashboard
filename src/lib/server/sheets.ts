import "server-only";

import { dashboardConfig } from "@/config/dashboard.config";
import { defaultMeetingWindow } from "@/lib/time";
import { googleJson, readSavedSheetId, saveSheetId } from "@/lib/server/google-auth";
import { getServerConfig } from "@/lib/server/env";
import { errorMessage } from "@/lib/redact";
import {
  LOG_HEADERS,
  PRINT_COLUMN_WIDTHS,
  PRINT_HEADERS,
  TOUR_HEADERS,
  dashboardSheetTabs,
} from "@/lib/sheet/schema";
import { logSheetRows, printSheetRows, tourSheetRows } from "@/lib/sheet/rows";
import type { NoShowAction, NoShowLogEntry, SheetLink, TourNotes, TourView } from "@/lib/types";

type SheetProps = { sheetId: number; title: string };

const NAVY = { red: 35 / 255, green: 53 / 255, blue: 93 / 255 };
const WHITE = { red: 1, green: 1, blue: 1 };

function a1(title: string, range: string): string {
  return `'${title.replace(/'/g, "''")}'!${range}`;
}

function columnCount(headers: readonly string[]): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const count = headers.length;
  if (count <= 26) return `A:${letters[count - 1]}`;
  const first = letters[Math.floor((count - 1) / 26) - 1];
  const second = letters[(count - 1) % 26];
  return `A:${first}${second}`;
}

async function readValues(spreadsheetId: string, range: string): Promise<string[][]> {
  try {
    const data = await googleJson(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`,
    );
    return ((data.values as string[][] | undefined) ?? []).map((row) => row.map((cell) => String(cell ?? "")));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("(400)") || message.includes("(404)")) return [];
    throw error;
  }
}

async function searchSheetId(name: string): Promise<string> {
  const q = `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
  const params = new URLSearchParams({ q, fields: "files(id,name)", pageSize: "5", spaces: "drive" });
  const data = await googleJson(`https://www.googleapis.com/drive/v3/files?${params}`);
  const files = (data.files as Array<{ id?: string }> | undefined) ?? [];
  return files[0]?.id ?? "";
}

async function spreadsheetSheets(spreadsheetId: string): Promise<SheetProps[]> {
  const data = await googleJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=sheets.properties(sheetId,title)`,
  );
  return ((data.sheets as Array<{ properties?: SheetProps }> | undefined) ?? []).map((sheet) => ({
    sheetId: Number(sheet.properties?.sheetId),
    title: String(sheet.properties?.title ?? ""),
  }));
}

async function ensureTabs(spreadsheetId: string, existing: SheetProps[]): Promise<SheetProps[]> {
  const missing = dashboardSheetTabs.filter((tab) => !existing.some((sheet) => sheet.title === tab.title));
  if (missing.length === 0) return existing;
  await googleJson(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: missing.map((tab) => ({
        addSheet: { properties: { title: tab.title, gridProperties: { frozenRowCount: 1 } } },
      })),
    }),
  });
  return spreadsheetSheets(spreadsheetId);
}

async function createSpreadsheet(name: string): Promise<{ id: string; sheets: SheetProps[] }> {
  const data = await googleJson("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    body: JSON.stringify({
      properties: { title: name, timeZone: dashboardConfig.school.timezone, locale: "en_GB" },
      sheets: dashboardSheetTabs.map((tab) => ({
        properties: { title: tab.title, gridProperties: { frozenRowCount: 1 } },
      })),
    }),
  });
  const id = String(data.spreadsheetId ?? "");
  const sheets = ((data.sheets as Array<{ properties?: SheetProps }> | undefined) ?? []).map((sheet) => ({
    sheetId: Number(sheet.properties?.sheetId),
    title: String(sheet.properties?.title ?? ""),
  }));
  return { id, sheets };
}

export async function ensureSpreadsheet(): Promise<{ id: string; sheets: SheetProps[] }> {
  const cfg = getServerConfig();
  const saved = readSavedSheetId();
  if (saved) {
    try {
      const sheets = await ensureTabs(saved, await spreadsheetSheets(saved));
      return { id: saved, sheets };
    } catch (error) {
      if (cfg.google.masterSheetId) throw error;
    }
  }
  const found = await searchSheetId(cfg.google.masterSheetName);
  if (found) {
    saveSheetId(found);
    const sheets = await ensureTabs(found, await spreadsheetSheets(found));
    return { id: found, sheets };
  }
  const created = await createSpreadsheet(cfg.google.masterSheetName);
  saveSheetId(created.id);
  return created;
}

function cell(row: string[], header: string[], name: string): string {
  const index = header.indexOf(name);
  return index >= 0 ? (row[index] ?? "").trim() : "";
}

function parseConcerns(value: string): { concerns: string[]; concernOther: string } {
  const concerns: string[] = [];
  let concernOther = "";
  for (const part of value.split(";").map((item) => item.trim()).filter(Boolean)) {
    if (part.toLowerCase().startsWith("other:")) {
      concernOther = part.slice(part.indexOf(":") + 1).trim();
      if (!concerns.includes("Other")) concerns.push("Other");
    } else {
      concerns.push(part);
    }
  }
  return { concerns, concernOther };
}

export function parseNotes(values: string[][]): TourNotes[] {
  if (values.length < 2) return [];
  const header = values[0];
  const notes: TourNotes[] = [];
  for (const row of values.slice(1)) {
    const registrationId = Number(cell(row, header, "Registration ID"));
    const gradeOfInterest = cell(row, header, "Grade of interest");
    if (!registrationId || !gradeOfInterest) continue;
    const parsedConcerns = parseConcerns(cell(row, header, "Concerns"));
    const interestLevel = Number(cell(row, header, "Interest level"));
    notes.push({
      registrationId,
      gradeOfInterest,
      leadSource: cell(row, header, "Lead source"),
      interestLevel: Number.isFinite(interestLevel) ? interestLevel : 0,
      concerns: parsedConcerns.concerns,
      concernOther: parsedConcerns.concernOther,
      nextStep: cell(row, header, "Next step"),
      tourGuide: cell(row, header, "Tour guide"),
      comment: cell(row, header, "Comment"),
      updatedAt: cell(row, header, "Notes updated"),
    });
  }
  return notes;
}

const ACTIONS = new Set<NoShowAction>(["No Show", "OA updated", "Undo"]);

export function parseLog(values: string[][]): NoShowLogEntry[] {
  if (values.length < 2) return [];
  const header = values[0];
  const entries: NoShowLogEntry[] = [];
  values.slice(1).forEach((row, index) => {
    const action = cell(row, header, "Action") as NoShowAction;
    const registrationId = Number(cell(row, header, "Registration ID"));
    const at = cell(row, header, "ISO time");
    if (!registrationId || !ACTIONS.has(action) || !at) return;
    entries.push({
      id: `sheet-${registrationId}-${index}`,
      at,
      registrationId,
      studentNames: cell(row, header, "Students"),
      action,
      actor: cell(row, header, "Actor"),
      calendarEventId: cell(row, header, "Calendar event ID"),
    });
  });
  return entries;
}

export async function readSheetState(): Promise<{ notes: TourNotes[]; log: NoShowLogEntry[]; link: SheetLink | null }> {
  const id = readSavedSheetId() || (await searchSheetId(getServerConfig().google.masterSheetName));
  if (!id) return { notes: [], log: [], link: null };
  if (!readSavedSheetId()) saveSheetId(id);
  const sheets = await spreadsheetSheets(id);
  const print = sheets.find((sheet) => sheet.title === "Print");
  const [tourValues, logValues] = await Promise.all([
    readValues(id, a1("Tours", columnCount(TOUR_HEADERS))),
    readValues(id, a1("No Show Log", columnCount(LOG_HEADERS))),
  ]);
  return {
    notes: parseNotes(tourValues),
    log: parseLog(logValues),
    link: sheetLink(id, print?.sheetId),
  };
}

function sheetLink(id: string, printSheetId?: number): SheetLink {
  const params = new URLSearchParams({
    format: "pdf",
    portrait: "false",
    fitw: "true",
    fzr: "true",
    gridlines: "false",
    printtitle: "false",
    sheetnames: "false",
    size: "7",
  });
  if (printSheetId != null) params.set("gid", String(printSheetId));
  return {
    id,
    url: `https://docs.google.com/spreadsheets/d/${id}/edit${printSheetId != null ? `#gid=${printSheetId}` : ""}`,
    printPdfUrl: `https://docs.google.com/spreadsheets/d/${id}/export?${params}`,
  };
}

async function writeGrid(spreadsheetId: string, title: string, values: string[][]) {
  await googleJson(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchClear`, {
    method: "POST",
    body: JSON.stringify({ ranges: [a1(title, columnCount(values[0] ?? ["A"]))] }),
  });
  const range = a1(title, "A1");
  await googleJson(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      body: JSON.stringify({ range, majorDimension: "ROWS", values }),
    },
  );
}

function headerRequest(sheetId: number, columns: number) {
  return {
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: columns },
      cell: {
        userEnteredFormat: {
          backgroundColor: NAVY,
          textFormat: { bold: true, foregroundColor: WHITE, fontSize: 10 },
          wrapStrategy: "WRAP",
          verticalAlignment: "MIDDLE",
        },
      },
      fields: "userEnteredFormat(backgroundColor,textFormat,wrapStrategy,verticalAlignment)",
    },
  };
}

let lastSheetWrite = 0;
const SHEET_DEBOUNCE_MS = 60_000;
let cachedLink: SheetLink | null = null;

export async function writeDashboardSheet(
  tours: TourView[],
  log: NoShowLogEntry[],
  options: { force?: boolean } = {},
): Promise<SheetLink> {
  if (!options.force && cachedLink && Date.now() - lastSheetWrite < SHEET_DEBOUNCE_MS) return cachedLink;
  const { id, sheets } = await ensureSpreadsheet();
  const byTitle = new Map(sheets.map((sheet) => [sheet.title, sheet]));
  const tourValues = tourSheetRows(tours);
  const logValues = logSheetRows(log);
  const printValues = printSheetRows(tours);
  await writeGrid(id, "Tours", tourValues);
  await writeGrid(id, "No Show Log", logValues);
  await writeGrid(id, "Print", printValues);

  const printSheet = byTitle.get("Print");
  const window = defaultMeetingWindow();
  const [fromY, fromM, fromD] = window.from.split("-").map(Number);
  const [toY, toM, toD] = window.to.split("-").map(Number);
  const requests: unknown[] = [];
  for (const tab of dashboardSheetTabs) {
    const sheet = byTitle.get(tab.title);
    if (!sheet) continue;
    const columns = tab.kind === "tours" ? TOUR_HEADERS.length : tab.kind === "log" ? LOG_HEADERS.length : PRINT_HEADERS.length;
    requests.push(headerRequest(sheet.sheetId, columns));
    requests.push({
      updateSheetProperties: {
        properties: { sheetId: sheet.sheetId, gridProperties: { frozenRowCount: 1 } },
        fields: "gridProperties.frozenRowCount",
      },
    });
  }
  if (printSheet) {
    PRINT_COLUMN_WIDTHS.forEach((pixelSize, index) => {
      requests.push({
        updateDimensionProperties: {
          range: { sheetId: printSheet.sheetId, dimension: "COLUMNS", startIndex: index, endIndex: index + 1 },
          properties: { pixelSize },
          fields: "pixelSize",
        },
      });
    });
    requests.push({
      updateCells: {
        range: {
          sheetId: printSheet.sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 1,
        },
        rows: [
          {
            values: [
              {
                note: `Meeting window ${window.from} to ${window.to} (Asia/Bangkok). Print this tab landscape, fit to width. The date filter uses that window and is reapplied when the dashboard refreshes the sheet. OpenApply is never updated from here.`,
              },
            ],
          },
        ],
        fields: "note",
      },
    });
    requests.push({
      setBasicFilter: {
        filter: {
          range: {
            sheetId: printSheet.sheetId,
            startRowIndex: 0,
            endRowIndex: Math.max(printValues.length, 2),
            startColumnIndex: 0,
            endColumnIndex: PRINT_HEADERS.length,
          },
          criteria: {
            0: {
              condition: {
                type: "CUSTOM_FORMULA",
                values: [
                  {
                    userEnteredValue: `=AND(A2>=DATE(${fromY},${fromM},${fromD}),A2<=DATE(${toY},${toM},${toD}))`,
                  },
                ],
              },
            },
          },
        },
      },
    });
  }

  try {
    await googleJson(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({ requests }),
    });
  } catch (error) {
    const withoutFilter = requests.filter((request) => !request || typeof request !== "object" || !("setBasicFilter" in request));
    await googleJson(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({ requests: withoutFilter }),
    });
    console.error(errorMessage(error));
  }

  const link = sheetLink(id, printSheet?.sheetId);
  cachedLink = link;
  lastSheetWrite = Date.now();
  return link;
}
