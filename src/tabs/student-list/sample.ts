export const studentListColumns = ["No.", "Student", "Grade", "Status"] as const;

/**
 * Fictional roster. A blank No. is not active. LOA students stay on the list.
 */
export const studentListRows: readonly (readonly string[])[] = [
  ["1842", "Isla Rahman", "G5", "Enrolled"],
  ["1843", "Ben Rahman", "G2", "Enrolled"],
  ["", "Nora Petrov", "G11", "LOA"],
  ["1844", "Kenji Watanabe", "G7", "Enrolled"],
  ["", "Aisha Mensah", "G4", "LOA"],
];

/** Active means the student has a No. LOA rows without a number stay listed and are not counted. */
export function activeStudentCount(rows: readonly (readonly string[])[]): number {
  return rows.filter((row) => row[0].trim() !== "").length;
}
