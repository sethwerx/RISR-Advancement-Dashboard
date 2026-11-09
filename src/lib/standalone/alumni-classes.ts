import type { OfficeRow } from "@/lib/office/types";

/**
 * Graduating classes on the Alumni tab.
 * Add Class of 2028 by appending one entry. `sheet` is the master-sheet tab to read.
 * Class of 2026 lives on the plain `Alumni` tab. Later classes use `Alumni YYYY`.
 */
export const alumniClasses = [
  { year: 2026, label: "Class of 2026", sheet: "Alumni" },
  { year: 2027, label: "Class of 2027", sheet: "Alumni 2027" },
] as const;

export type AlumniClassYear = (typeof alumniClasses)[number]["year"];

export const defaultAlumniClassYear: AlumniClassYear = 2026;

export function alumniSheetTitles(): string[] {
  return [...new Set(alumniClasses.map((item) => item.sheet))];
}

/** Tabs other than the original `Alumni` sheet. A missing one must not stop Reload data. */
export function optionalAlumniSheetTitles(): string[] {
  return alumniSheetTitles().filter((title) => title !== "Alumni");
}

export function alumniClassLabel(year: number): string {
  return alumniClasses.find((item) => item.year === year)?.label ?? `Class of ${year}`;
}

export function missingAlumniClassMessage(year: number): string {
  return `No ${alumniClassLabel(year)} alumni yet`;
}

export function alumniGradYear(row: Pick<OfficeRow, "gradYear" | "cells">): number | null {
  const text = (row.cells["Graduating year"] ?? row.cells["Class Year"] ?? "").trim();
  if (/^\d{4}$/.test(text)) return Number(text);
  return row.gradYear != null && row.gradYear >= 1900 ? row.gradYear : null;
}

/** Exact graduating year. Class of 2026 is only 2026, not 2026 and 2027. */
export function filterAlumniByClass(rows: OfficeRow[], year: number | "all"): OfficeRow[] {
  if (year === "all") return rows;
  return rows.filter((row) => alumniGradYear(row) === year);
}

/** Sheet headers stay Alumni ID and Graduating year. The table shows these labels. */
export function alumniColumnLabel(column: string): string {
  if (column === "Alumni ID") return "Student ID";
  if (column === "Graduating year") return "Class Year";
  return column;
}
