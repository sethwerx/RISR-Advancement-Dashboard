export const scholarshipColumns = ["Applicant", "Grade", "Scholarship type", "Amount/percent", "Status"] as const;

export const scholarshipRows: readonly (readonly string[])[] = [
  ["Isla Rahman", "G5", "Merit", "25%", "Offered"],
  ["Kenji Watanabe", "G7", "Need-based", "฿120,000", "Under review"],
  ["Ben Rahman", "G2", "Sibling", "10%", "Awarded"],
  ["Nora Petrov", "G11", "Staff", "50%", "Waitlist"],
];
