export const officeTabIds = [
  "applicants",
  "assessments",
  "admitted",
  "canceled-declined",
  "offers",
  "student-list",
  "withdrawals",
  "alumni",
  "scholarships",
] as const;

export type OfficeTabId = (typeof officeTabIds)[number];

export type MatchMethod = "oa-id" | "student-id" | "name-dob" | "name-only" | "single";

export type SourcePart = {
  source: string;
  oaId?: string;
  studentId?: string;
  firstName: string;
  lastName: string;
  dob?: string;
  grade?: string;
  enrollmentYear?: number;
  fields: Record<string, string>;
};

export type JoinedPerson = {
  id: string;
  oaId?: string;
  studentId?: string;
  firstName: string;
  lastName: string;
  dob?: string;
  grade: string;
  enrollmentYear?: number;
  fields: Record<string, string>;
  sources: string[];
  match: MatchMethod;
  confidence: "high" | "low";
};

export type OfficeRow = {
  id: string;
  enrollmentYear?: number;
  oaStatus?: string;
  gradYear?: number;
  cells: Record<string, string>;
  detail: { label: string; value: string }[];
  badges: string[];
};

export type OfficeChart = {
  id: string;
  title: string;
  points: { label: string; value: number }[];
};

export type OfficeKpi = {
  id: string;
  label: string;
  value: string;
  chartId: string;
};

export type OfficeGap = { label: string; detail: string };

export type OfficeTabPayload = {
  id: OfficeTabId;
  title: string;
  columns: string[];
  rows: OfficeRow[];
  kpis: OfficeKpi[];
  charts: OfficeChart[];
  gaps: OfficeGap[];
  note?: string;
  reconciliation?: { label: string; count: number }[];
  mismatches?: { name: string; issue: string }[];
};

export type SyncLogEntry = {
  at: string;
  scope: string;
  rows: number;
  mode: "sample" | "live";
  note: string;
};

export type OfficeSnapshot = {
  generatedAt: string;
  mock: boolean;
  tabs: Record<OfficeTabId, OfficeTabPayload>;
  syncLog: SyncLogEntry[];
};
