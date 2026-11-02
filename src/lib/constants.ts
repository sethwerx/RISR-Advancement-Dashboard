import type { SyncStatus } from "@/lib/types";

export const GRADES = [
  "PreK",
  "KG",
  "G1",
  "G2",
  "G3",
  "G4",
  "G5",
  "G6",
  "G7",
  "G8",
  "G9",
  "G10",
  "G11",
  "G12",
] as const;

export const LEAD_SOURCES = [
  "School website",
  "Current family referral",
  "Education agent",
  "Open house",
  "Social media",
  "Relocation company",
  "Embassy / corporate HR",
  "Walk-in",
  "Other",
] as const;

export const CONCERNS = [
  "Tuition / fees",
  "Academic programme",
  "Language support",
  "Class size",
  "Transport",
  "University counselling",
  "After-school activities",
  "Commute",
  "Other",
] as const;

export const NEXT_STEPS = [
  "Send application link",
  "Schedule follow-up call",
  "Campus shadow day",
  "Wait for documents",
  "Not proceeding",
  "Enroll next term",
] as const;

export const INTEREST_LABELS: Record<number, string> = {
  1: "Exploring",
  2: "Curious",
  3: "Interested",
  4: "Strong",
  5: "Ready to apply",
};

export const SYNC_LABEL: Record<SyncStatus, string> = {
  synced: "Synced",
  missing: "Missing on calendar",
  rescheduled: "Rescheduled in OA",
  canceled: "Canceled in OA",
};

export const STATE_LABEL = {
  scheduled: "Scheduled",
  canceled: "Canceled",
  other: "Other",
} as const;

/** Statuses that mean the family has entered the application pipeline. */
export const CONVERTED_STATUSES = [
  "Applied",
  "Waitlisted",
  "Admitted",
  "Enrolled",
  "Declined",
  "Withdrawn",
] as const;

export const STATUS_PRIORITY = [
  "Enrolled",
  "Admitted",
  "Waitlisted",
  "Applied",
  "Declined",
  "Withdrawn",
  "Inquiry",
] as const;

export function gradeRank(grade: string): number {
  const index = GRADES.indexOf(grade as (typeof GRADES)[number]);
  return index === -1 ? 100 : index;
}

export function representativeStatus(statuses: string[]): string {
  const cleaned = statuses.map((status) => status.trim()).filter(Boolean);
  for (const candidate of STATUS_PRIORITY) {
    if (cleaned.some((status) => status.toLowerCase() === candidate.toLowerCase())) return candidate;
  }
  return cleaned[0] || "Unknown";
}

export function isConvertedStatus(status: string): boolean {
  return CONVERTED_STATUSES.some((item) => item.toLowerCase() === status.toLowerCase());
}
