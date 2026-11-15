import { optionalAlumniSheetTitles } from "@/lib/standalone/alumni-classes";
import { optionalScheduleTitles } from "@/lib/standalone/schedule";
import { optionalYearTabTitles, yearTabIsRequired } from "@/lib/standalone/school-years";
import { studentListReadError } from "@/lib/standalone/data";
import { standaloneSheetTitles } from "@/lib/office/sheet-schema";

/** How many tab reads one Apps Script call returns. google.script.run allows few large replies. */
export const SHEET_READ_BATCH = 8;

/** The local file and the web app both read this rectangle. Do not widen it casually. */
export function sheetA1Range(title: string): string {
  return `'${title.replaceAll("'", "''")}'!A1:AZ5000`;
}

export function masterSheetReadTitles(): string[] {
  return [...new Set([...standaloneSheetTitles, ...optionalYearTabTitles(), ...optionalAlumniSheetTitles(), ...optionalScheduleTitles()])];
}

export function chunkList<T>(items: T[], size: number): T[][] {
  const step = Math.max(1, size);
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += step) chunks.push(items.slice(index, index + step));
  return chunks;
}

export type SheetReadResult = { values: string[][]; error: string };

/**
 * Same outcomes as a browser Sheets read:
 * a missing optional tab is empty, Student List reports the HTTP status, anything else stops the load.
 */
export function interpretSheetResponse(title: string, status: number, values: string[][] | null | undefined, detail = ""): SheetReadResult {
  if (status >= 200 && status < 300) return { values: values ?? [], error: "" };
  const text = detail.replace(/\s+/g, " ").trim().slice(0, 240);
  if (yearTabIsRequired(title)) return { values: [], error: studentListReadError(status, text) };
  if (status === 400 || optionalYearTabTitles().includes(title) || optionalAlumniSheetTitles().includes(title) || optionalScheduleTitles().includes(title)) {
    return { values: [], error: "" };
  }
  const message = text ? `Could not read “${title}” (HTTP ${status}). ${text}` : `Could not read “${title}” (HTTP ${status}).`;
  throw new Error(message);
}
