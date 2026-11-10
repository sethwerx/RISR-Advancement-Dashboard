import type { OfficeRow } from "@/lib/office/types";
import { parseSheetDate } from "@/lib/standalone/schedule";

export const enrollmentYearOptions = ["2026-27", "2027-28", "2028-29"] as const;
export type EnrollmentYearOption = (typeof enrollmentYearOptions)[number] | "all";

export const applicantBuckets = ["Incomplete", "Missing docs", "Assessment booked", "Reviewing"] as const;
export type ApplicantBucket = (typeof applicantBuckets)[number];

export function enrollmentYearKey(value: string): string {
  const match = value.trim().match(/(20\d{2})/);
  if (!match) return "";
  const start = Number(match[1]);
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

export function rowEnrollmentYear(row: OfficeRow): string {
  return enrollmentYearKey(row.cells["Enrollment year"] || (row.enrollmentYear ? String(row.enrollmentYear) : ""));
}

export function filterByEnrollmentYear(rows: OfficeRow[], year: EnrollmentYearOption): OfficeRow[] {
  if (year === "all") return rows;
  return rows.filter((row) => rowEnrollmentYear(row) === year);
}

export function parseFlexibleDate(value: string): string {
  const named = parseSheetDate(value);
  if (named) return named;
  const slash = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!slash) return "";
  const first = Number(slash[1]);
  const second = Number(slash[2]);
  const month = first > 12 ? second : first;
  const day = first > 12 ? first : second;
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return `${slash[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function semesterEnd(today: string): string {
  const [year, month] = today.split("-").map(Number);
  return month >= 8 ? `${year}-12-31` : `${year}-07-31`;
}

export function stillAdmitted(row: OfficeRow): boolean {
  const status = `${row.cells.Status || ""} ${row.cells.Stage || ""}`.toLowerCase();
  if (/enroll|withdraw|cancel|declin/.test(status) && !/not yet enrolled/.test(status)) return false;
  return true;
}

export function startDatePassed(row: OfficeRow, today: string): boolean {
  const start = parseFlexibleDate(row.cells["Start date"] || "");
  return Boolean(start) && start < today && stillAdmitted(row);
}

export function startingThisSemester(row: OfficeRow, today: string): boolean {
  const start = parseFlexibleDate(row.cells["Start date"] || "");
  return Boolean(start) && start >= today && start <= semesterEnd(today);
}

export function paymentLabel(row: OfficeRow): string {
  return row.cells["Payment status"]?.trim() || "Awaiting Finance";
}

export function admittedKpis(rows: OfficeRow[], today: string): { total: number; starting: number; passed: number; awaitingFinance: number } {
  return {
    total: rows.length,
    starting: rows.filter((row) => startingThisSemester(row, today)).length,
    passed: rows.filter((row) => startDatePassed(row, today)).length,
    awaitingFinance: rows.filter((row) => !row.cells["Payment status"]?.trim()).length,
  };
}

export function normalizeBucket(value: string): string {
  const text = value.trim().toLowerCase();
  if (!text) return "";
  if (text.includes("incomplete")) return "Incomplete";
  if (text.includes("missing")) return "Missing docs";
  if (text.includes("book")) return "Assessment booked";
  if (text.includes("review")) return "Reviewing";
  return value.trim();
}

export function bucketRank(value: string): number {
  const index = applicantBuckets.indexOf(normalizeBucket(value) as ApplicantBucket);
  return index === -1 ? applicantBuckets.length : index;
}

export function missingItemChips(value: string): string[] {
  return value.split(/[,;\n|]/).map((item) => item.trim()).filter(Boolean);
}

export function sortApplicants(rows: OfficeRow[]): OfficeRow[] {
  return [...rows].sort((left, right) => {
    const bucket = bucketRank(left.cells.Bucket || "") - bucketRank(right.cells.Bucket || "");
    if (bucket) return bucket;
    const leftUpdated = parseFlexibleDate(left.cells["Last updated"] || "");
    const rightUpdated = parseFlexibleDate(right.cells["Last updated"] || "");
    if (leftUpdated !== rightUpdated) {
      if (!leftUpdated) return 1;
      if (!rightUpdated) return -1;
      return rightUpdated.localeCompare(leftUpdated);
    }
    return (left.cells.Name || "").localeCompare(right.cells.Name || "");
  });
}
