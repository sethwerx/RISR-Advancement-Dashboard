import type { OfficeRow } from "@/lib/office/types";

/** Grade buttons for Weena's STUDENT LIST SY2026-2027, one tab per level. */
export const studentGradeLevels = [
  "Pre-K 2",
  "Pre-K 3",
  "Pre-K 4",
  "KG",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
] as const;

export type StudentGradeLevel = (typeof studentGradeLevels)[number];

/** Map Weena labels (Pre K2, Gr 1) and short labels (G1, KG) onto one button. */
export function canonicalGrade(value: string): string {
  const text = value.trim().toLowerCase().replace(/\./g, "").replace(/-/g, " ").replace(/\s+/g, " ");
  if (!text) return "";
  if (/pre\s*k\s*2|prek\s*2|pk\s*2/.test(text)) return "Pre-K 2";
  if (/pre\s*k\s*3|prek\s*3|pk\s*3/.test(text)) return "Pre-K 3";
  if (/pre\s*k\s*4|prek\s*4|pk\s*4/.test(text)) return "Pre-K 4";
  if (/^(kg|kindergarten|k)$/.test(text)) return "KG";
  const numbered = text.match(/(?:grade|gr|g)\s*(\d{1,2})$/);
  if (numbered) {
    const level = Number(numbered[1]);
    if (level >= 1 && level <= 12) return `Grade ${level}`;
  }
  return "";
}

export function filterStudentsByGrade(rows: OfficeRow[], grade: "all" | StudentGradeLevel): OfficeRow[] {
  if (grade === "all") return rows;
  return rows.filter((row) => canonicalGrade(row.cells.Grade || "") === grade);
}
