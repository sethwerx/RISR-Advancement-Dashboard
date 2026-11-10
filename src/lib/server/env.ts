import "server-only";

import { dashboardConfig } from "@/config/dashboard.config";

function splitList(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function eventIds(value: string | undefined): number[] {
  const parsed = splitList(value)
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item));
  return parsed.length > 0 ? parsed : [...dashboardConfig.openApply.tourEventIds];
}

export function isMockMode(): boolean {
  const flag = process.env.MOCK_MODE?.trim().toLowerCase();
  if (flag === "true" || flag === "1" || flag === "yes") return true;
  if (flag === "false" || flag === "0" || flag === "no") return false;
  const hasOpenApply = Boolean(process.env.OPENAPPLY_CLIENT_ID && process.env.OPENAPPLY_CLIENT_SECRET);
  const hasGoogle = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return !hasOpenApply || !hasGoogle;
}

export function getServerConfig() {
  const guests = splitList(process.env.GOOGLE_GUEST_EMAILS);
  return {
    mock: isMockMode(),
    durationMinutes: dashboardConfig.tours.durationMinutes,
    actorName: dashboardConfig.ui.userDisplayName,
    openApply: {
      baseUrl: (process.env.OPENAPPLY_BASE_URL || dashboardConfig.openApply.baseUrl).replace(/\/$/, ""),
      tokenUrl: process.env.OPENAPPLY_TOKEN_URL || dashboardConfig.openApply.tokenUrl,
      clientId: process.env.OPENAPPLY_CLIENT_ID || "",
      clientSecret: process.env.OPENAPPLY_CLIENT_SECRET || "",
      tourEventIds: eventIds(process.env.OPENAPPLY_TOUR_EVENT_IDS),
      userAgent: dashboardConfig.openApply.userAgent,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirectUri: process.env.GOOGLE_REDIRECT_URI || dashboardConfig.google.redirectUri,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN || "",
      calendarId: process.env.GOOGLE_CALENDAR_ID || dashboardConfig.google.calendarId,
      organizerEmail: (process.env.GOOGLE_ORGANIZER_EMAIL || dashboardConfig.google.organizerEmail).toLowerCase(),
      guests: guests.length > 0 ? guests : [...dashboardConfig.google.guestEmails],
      notesTemplateDocId: process.env.GOOGLE_NOTES_TEMPLATE_DOC_ID || dashboardConfig.google.notesTemplateDocId,
      masterSheetId: process.env.GOOGLE_MASTER_SHEET_ID || "",
      masterSheetName: process.env.GOOGLE_MASTER_SHEET_NAME || dashboardConfig.google.masterSheetName,
      scopes: [...dashboardConfig.google.scopes],
    },
    sessionSecret: process.env.SESSION_SECRET || "",
  };
}
