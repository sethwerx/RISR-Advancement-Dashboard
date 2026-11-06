export const admittedColumns = ["Student", "Grade", "Entry term", "Decision date", "Status"] as const;

export const admittedRows: readonly (readonly string[])[] = [
  ["Chloe Nguyen", "G4", "2026–27", "2026-02-12", "Accepted"],
  ["Mateo Alvarez", "G8", "2026–27", "2026-01-28", "Deposit received"],
  ["Yusuf Demir", "G6", "2026–27", "2026-03-04", "Enrolled"],
  ["Sara Lindqvist", "G2", "2027–28", "2026-03-18", "Accepted"],
];
