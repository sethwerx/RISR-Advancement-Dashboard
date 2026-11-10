/** Every dashboard section. Each one renders the shared Sync Now control. */
export const dashboardTabs = [
  { id: "tours", label: "Tours/Visits", enabled: true },
  { id: "open-house", label: "Open House", enabled: true },
  { id: "applicants", label: "Applicants", enabled: true },
  { id: "assessments", label: "Assessments", enabled: true },
  { id: "admitted", label: "Admitted", enabled: true },
  { id: "canceled-declined", label: "Canceled/Declined", enabled: true },
  { id: "offers", label: "Offers", enabled: true },
  { id: "student-list", label: "Student List", enabled: true },
  { id: "new-students", label: "New Students", enabled: true },
  { id: "withdrawals", label: "Withdrawals", enabled: true },
  { id: "alumni", label: "Alumni", enabled: true },
  { id: "scholarships", label: "Scholarships", enabled: true },
  { id: "retention", label: "Retention", enabled: false },
  { id: "analytics", label: "Analytics", enabled: false },
] as const;

export const syncControlLabel = "Sync Now";
