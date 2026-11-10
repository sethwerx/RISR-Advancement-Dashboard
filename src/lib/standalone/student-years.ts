import type { OfficeRow } from "@/lib/office/types";
import { canonicalGrade, studentGradeLevels } from "@/lib/standalone/grades";
import {
  currentSchoolYear,
  emptyYearMap,
  missingYearMessage,
  optionalYearTabTitles,
  schoolYears,
  yearTabNames,
  type SchoolYear,
  type YearMap,
} from "@/lib/standalone/school-years";

export const studentListSchoolYears = schoolYears;
export type StudentListSchoolYear = SchoolYear;
export const currentStudentListYear = currentSchoolYear;
export type StudentListByYear = YearMap;

export function emptyStudentListsByYear(): YearMap {
  return emptyYearMap();
}

export function studentListTabNames(year: SchoolYear): string[] {
  return yearTabNames("Student List", year);
}

export function studentListTabIsRequired(title: string): boolean {
  return title === "Student List";
}

export function optionalStudentListTitles(): string[] {
  return optionalYearTabTitles().filter((title) => title.startsWith("Student List"));
}

export function missingStudentListMessage(year: string): string {
  return missingYearMessage("student-list", year);
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
