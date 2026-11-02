/**
 * Non-secret defaults for the RISR Advancement Dashboard.
 * Secrets and deployment-specific overrides belong in environment variables.
 * See `.env.example` and `src/lib/server/env.ts`.
 */
export const dashboardConfig = {
  school: {
    name: "Ruamrudee International School Ratchapruek",
    shortName: "RISR",
    office: "Admissions & Advancement",
    timezone: "Asia/Bangkok",
    timezoneLabel: "ICT",
  },
  ui: {
    productName: "RISR Advancement",
    userDisplayName: "Seth Janekarnkit",
    userTitle: "Head of Admissions",
  },
  openApply: {
    baseUrl: "https://risr.openapply.com/api/v3",
    tokenUrl: "https://risr.openapply.com/oauth/token",
    profileUrlTemplate: "https://risr.openapply.com/admin/students/{id}",
    /** PreK/KG, ES/MS/HS, previous PreK/KG 10am, School Break. */
    tourEventIds: [22964, 22965, 23638, 24622],
    /**
     * OpenApply has rejected default Python user agents. This is an ordinary browser UA.
     */
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  },
  google: {
    redirectUri: "http://localhost:3000/api/auth/google/callback",
    calendarId: "c_ga82ohfe30hhckqp10n1ipvktc@group.calendar.google.com",
    calendarName: "School Tour/Visit",
    organizerEmail: "admissions@risr.ac.th",
    guestEmails: ["sethj@risr.ac.th", "passarananv@risr.ac.th"],
    notesTemplateDocId: "1OC8AxiBwOiYAloJGZFfuq-cuLCTXrjzkyL9jIBHr1Z8",
    masterSheetName: "RISR Advancement Dashboard",
    scopes: [
      "openid",
      "email",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/documents",
    ],
  },
  tours: {
    durationMinutes: 120,
    /** How far the calendar list reaches, so older registrations can still be matched. */
    calendarPastDays: 365 * 5,
    calendarFutureDays: 365 * 2,
    /** Meeting print window, in days relative to today (Asia/Bangkok). */
    printDaysBefore: 14,
    printDaysAfter: 45,
  },
  tourEvents: [
    { id: 22964, label: "PreK/KG" },
    { id: 22965, label: "ES/MS/HS" },
    { id: 23638, label: "PreK/KG 10am (previous)" },
    { id: 24622, label: "School Break" },
  ],
} as const;

export function tourEventLabel(eventId: number, apiTitle?: string): string {
  if (apiTitle && apiTitle.trim()) return apiTitle.trim();
  const known = dashboardConfig.tourEvents.find((event) => event.id === eventId);
  return known?.label ?? `Event ${eventId}`;
}
