export const alumniColumns = ["Name", "Class year", "Last grade", "Email", "Engagement"] as const;

export const alumniRows: readonly (readonly string[])[] = [
  ["Elena Rossi", "2024", "G12", "elena.rossi@example.com", "Mentor"],
  ["Liam Okafor", "2023", "G12", "liam.okafor@example.com", "Donor"],
  ["Hana Sato", "2025", "G12", "hana.sato@example.com", "No recent contact"],
  ["Noah Kim", "2022", "G12", "noah.kim@example.com", "Event guest"],
];
