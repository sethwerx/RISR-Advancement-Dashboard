/**
 * Source file and database ids from the data map.
 * These identify spreadsheets and Notion databases. They are not student records.
 */
export const notionSources = {
  pipeline: "2b0a1354-2ce0-8099-b6e3-000b045be6d9",
  studentList2526: "2b1a1354-2ce0-8098-8f98-000bca9a4b33",
  retention: "2b1a1354-2ce0-805f-a3cd-000b345edde0",
} as const;

export const sourceSheets = {
  studentList2627: "156hsISrGNmL2Q-90BsEwhhZ0n6kWwdcZ_Dp15JVXl6A",
  studentList2526: "1oEwGqc72zHtOwkKptX0rA_i7qebK15CgYff-JKdUjF0",
  trackingNewStudents: "1MYGE3uWkKJ4G9chxdVdBm7Xrhs9dr7GzNFWYOVHYZtw",
  withdrawalsAllYears: "1f7t-vNka0rjZF6mUSPsY21RcTzSJeJwcysoVqMA5HU0",
  withdrawals2526: "1L5cpJlBMoWQ5rPBSVzLVdJR2rMyhB2YpwLMQtMxfBp0",
  withdrawals2627: "1wHCNqk7bGcNBiftTCH7qM2bdAPRaoElhB_Gzj3Hsugs",
  oaWithdrawalPreview: "14xB07GlDUxI7TWzK23skl-c4H28EwCD_Ho0VNBReQOY",
  alumniLatest: "1hcmeWBCqlzWcx0Bbh8KfrpcoETZCKatEczQ6samOunM",
  alumniOriginal: "1-sEOewTrOAI0HJATkSrE-gQ2zl8VmjWNt6O0qa653qE",
  scholarshipList: "11HgWdvXW5ftuo1lbzdIzDxXJmBCs34-ncZGExiutkOY",
} as const;

/** Finance file title date. Shown on Scholarships as the data-as-of note. */
export const scholarshipDataAsOf = "6 March 2026";

export const defaultAcademicYear = "2026-27";

export const officeSheetTitles = [
  "Applicants",
  "Assessments",
  "Admitted",
  "Canceled/Declined",
  "Offers",
  "Student List",
  "Withdrawals",
  "Alumni",
  "Scholarships",
  "Sync Log",
] as const;
