import type { OfficeRow, OfficeTabPayload } from "@/lib/office/types";
import { canonicalGrade, studentGradeLevels } from "@/lib/standalone/grades";

/** RISR opened in 2019. Newest school year is first. 2026-2027 is the current roster. */
export const studentListSchoolYears = [
  "2026-2027",
  "2025-2026",
  "2024-2025",
  "2023-2024",
  "2022-2023",
  "2021-2022",
  "2020-2021",
  "2019-2020",
] as const;

export type StudentListSchoolYear = (typeof studentListSchoolYears)[number];

export const currentStudentListYear: StudentListSchoolYear = "2026-2027";

export type StudentListByYear = Record<StudentListSchoolYear, OfficeTabPayload | null>;

export function emptyStudentListsByYear(): StudentListByYear {
  return Object.fromEntries(studentListSchoolYears.map((year) => [year, null])) as StudentListByYear;
}

/** Current year is the merged "Student List" tab, with an optional same-year alias. */
export function studentListTabNames(year: StudentListSchoolYear): string[] {
  if (year === currentStudentListYear) return ["Student List", `Student List ${year}`];
  return [`Student List ${year}`];
}

/** Past-year tabs and the current-year alias may be absent. Only "Student List" is required. */
export function studentListTabIsRequired(title: string): boolean {
  return title === "Student List";
}

export function optionalStudentListTitles(): string[] {
  return studentListSchoolYears.flatMap((year) => studentListTabNames(year).filter((title) => !studentListTabIsRequired(title)));
}

export function missingStudentListMessage(year: string): string {
  return `No student list found for ${year} yet`;
}

/** Grade buttons for one school year: Weena labels that appear, then any other label in that sheet. */
export function gradeButtonsForRows(rows: OfficeRow[]): string[] {
  const canonical = new Set<string>();
  const extra: string[] = [];
  for (const row of rows) {
    const raw = (row.cells.Grade ?? "").trim();
    const mapped = canonicalGrade(raw);
    if (mapped) canonical.add(mapped);
    else if (raw && !extra.includes(raw)) extra.push(raw);
  }
  return [...studentGradeLevels.filter((level) => canonical.has(level)), ...extra];
}
