import { defaultAcademicYear } from "@/config/sources";
import type { OfficeRow, OfficeTabId } from "@/lib/office/types";

export function academicStart(year: string): number | null {
  const match = /^(\d{4})-\d{2}$/.exec(year.trim());
  return match ? Number(match[1]) : null;
}

/**
 * Selected year defaults to 2026-27.
 * Applicants with OA status pending stay visible back to enrollment year 2021,
 * through the year after the selected start (2027 when the filter is 2026-27).
 */
export function rowInYear(row: Pick<OfficeRow, "enrollmentYear" | "oaStatus" | "gradYear">, year: string, tab: OfficeTabId): boolean {
  if (year === "all") return true;
  const start = academicStart(year);
  if (start == null) return true;
  if (tab === "applicants" && row.oaStatus === "pending") {
    const value = row.enrollmentYear;
    if (value == null) return false;
    return value >= 2021 && value <= start + 1;
  }
  if (tab === "alumni") return row.gradYear === start || row.gradYear === start + 1;
  if (tab === "student-list" && (row.enrollmentYear == null || row.enrollmentYear < 2000)) return true;
  return row.enrollmentYear === start;
}

export const yearOptions = ["2021-22", "2022-23", "2023-24", "2024-25", "2025-26", "2026-27", "2027-28", "2028-29", "all"];

export { defaultAcademicYear };
