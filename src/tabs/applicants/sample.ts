/** Notion "School Admission Pipeline" stages, in pipeline order. */
export const admissionPipelineStages = [
  "Inquiry",
  "Open House/Tour",
  "Family is Interested",
  "Application",
  "Assessment",
  "File Review",
  "Offer",
  "Seat Reserved",
  "Admitted/Enrolled",
] as const;

export const applicantColumns = ["Applicant", "Grade", "Stage"] as const;

/** Fictional families. One row per pipeline stage so the placeholder shows the full list. */
export const applicantRows: readonly (readonly string[])[] = [
  ["Kiran Desai", "G5", "Inquiry"],
  ["Lina Moreau", "G1", "Open House/Tour"],
  ["Theo Nakamura", "G7", "Family is Interested"],
  ["Amara Diallo", "G3", "Application"],
  ["Owen Hart", "G9", "Assessment"],
  ["Sara Lindqvist", "G2", "File Review"],
  ["Yusuf Demir", "G6", "Offer"],
  ["Chloe Nguyen", "G4", "Seat Reserved"],
  ["Mateo Alvarez", "G8", "Admitted/Enrolled"],
];
