export const canceledDeclinedColumns = ["Applicant", "Grade", "Outcome", "Date", "Reason"] as const;

export const canceledDeclinedRows: readonly (readonly string[])[] = [
  ["Owen Hart", "G9", "Declined", "2026-02-20", "Accepted another school"],
  ["Lina Moreau", "G1", "Canceled", "2026-01-15", "Family relocated"],
  ["Kiran Desai", "G5", "Declined", "2026-03-02", "Tuition"],
  ["Theo Nakamura", "G7", "Canceled", "2026-03-11", "Withdrew before assessment"],
];
