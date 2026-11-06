import type { OfficeRow } from "@/lib/office/types";

/** Exact Grade values on the master sheet Student List tab, in Weena's order. */
export const studentGradeLevels = [
  "Pre K 2",
  "Pre K 3",
  "Pre K 4",
  "KG",
  "Gr 1",
  "Gr 2",
  "Gr 3",
  "Gr 4",
  "Gr 5",
  "Gr 6",
  "Gr 7",
  "Gr 8",
  "Gr 9",
  "Gr 10",
  "Gr 11",
  "Gr 12",
] as const;

export type StudentGradeLevel = (typeof studentGradeLevels)[number];

/** Map sheet values and older labels onto the master sheet Grade string. */
export function canonicalGrade(value: string): string {
  const text = value.trim().toLowerCase().replace(/\./g, "").replace(/-/g, " ").replace(/\s+/g, " ");
  if (!text) return "";
  if (/pre\s*k\s*2|prek\s*2|pk\s*2/.test(text)) return "Pre K 2";
  if (/pre\s*k\s*3|prek\s*3|pk\s*3/.test(text)) return "Pre K 3";
  if (/pre\s*k\s*4|prek\s*4|pk\s*4/.test(text)) return "Pre K 4";
  if (/^(kg|kindergarten|k)$/.test(text)) return "KG";
  const numbered = text.match(/(?:grade|gr|g)\s*(\d{1,2})$/);
  if (numbered) {
    const level = Number(numbered[1]);
    if (level >= 1 && level <= 12) return `Gr ${level}`;
  }
  return "";
}

export function filterStudentsByGrade(rows: OfficeRow[], grade: "all" | StudentGradeLevel): OfficeRow[] {
  if (grade === "all") return rows;
  const selected = canonicalGrade(grade);
  return rows.filter((row) => canonicalGrade(row.cells.Grade || "") === selected);
}
