import { LOG_HEADERS, TOUR_HEADERS } from "@/lib/sheet/schema";

/** Column contract for the master spreadsheet. An external refresh writes these headers in row 1. */
export const masterSheetColumns = {
  Tours: TOUR_HEADERS,
  Applicants: [
    "Name",
    "OA id",
    "Student ID",
    "Grade",
    "Enrollment year",
    "Applied",
    "Inquired",
    "Stage",
    "Fee",
    "Lead source",
    "Nationality",
    "Gender",
    "Previous school",
  ],
  Assessments: ["Name", "Grade", "Enrollment year", "Assessment date", "Type", "Result", "Decision", "Status", "ELD/LS"],
  Admitted: ["Name", "OA id", "Grade", "Enrollment year", "Admitted", "Enrolled", "Stage", "Invoice", "Fee paid", "Start date", "Payment", "Class"],
  "Canceled/Declined": ["Name", "OA id", "Grade", "Enrollment year", "Declined", "Reason", "Outcome", "Tags", "Notion reason", "Previous school"],
  Offers: ["Name", "Grade", "Offer date", "Decision", "Signatures", "Seat reservation", "Scholarship", "Outcome"],
  "Student List": ["No.", "Student ID", "OA id", "Name", "Grade", "Homeroom", "Gender", "Nationality", "DOB", "Start date", "Status", "Scholarship", "Sibling"],
  Withdrawals: ["Student ID", "OA id", "Name", "Grade", "Notified", "Last day", "Form signed", "Reason", "Category", "Checklist", "OA withdrawn"],
  Alumni: ["Alumni ID", "Name", "Graduating year", "City", "Country", "University", "Major", "Consent", "Offer country"],
  Scholarships: ["Student ID", "Name", "Grade", "Register year", "Discount type", "% Discount", "Scholarship end", "Reviewed", "Category"],
  "No Show Log": LOG_HEADERS,
  "Sync Log": ["At", "Scope", "Rows", "Mode", "Note"],
} as const;

export type MasterSheetTitle = keyof typeof masterSheetColumns;

/** Tabs the local HTML file reads. Snapshot is optional and holds the full JSON payload. */
export const standaloneSheetTitles = [
  "Tours",
  "Tours/Visits",
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
  "Snapshot",
] as const;
