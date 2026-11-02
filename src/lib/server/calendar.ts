import "server-only";

import { dashboardConfig } from "@/config/dashboard.config";
import { buildEventBody, buildNoShowPatch, calendarWriteQuery } from "@/lib/calendar-payload";
import { googleJson } from "@/lib/server/google-auth";
import { getServerConfig } from "@/lib/server/env";
import { extractRegistrationId } from "@/lib/title";
import type { CalendarEvent } from "@/lib/types";

type GoogleEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  htmlLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attachments?: Array<{ fileUrl?: string; title?: string; fileId?: string }>;
  extendedProperties?: { private?: Record<string, string> };
};

function mapGoogleEvent(item: GoogleEvent): CalendarEvent | null {
  if (!item.id || item.status === "cancelled") return null;
  const startIso = item.start?.dateTime || (item.start?.date ? `${item.start.date}T00:00:00+07:00` : "");
  const endIso = item.end?.dateTime || (item.end?.date ? `${item.end.date}T00:00:00+07:00` : "");
  if (!startIso || !endIso) return null;
  const extended = item.extendedProperties?.private?.oaRegistrationId;
  const registrationId = extended && /^\d+$/.test(extended) ? Number(extended) : extractRegistrationId(item.description);
  const notes =
    item.attachments?.find((attachment) => attachment.title === "Tour Notes") ??
    item.attachments?.find((attachment) => attachment.fileUrl?.includes("docs.google.com"));
  return {
    id: item.id,
    title: item.summary ?? "",
    description: item.description ?? "",
    startIso,
    endIso,
    htmlLink: item.htmlLink ?? "",
    registrationId,
    notesDocUrl: notes?.fileUrl ?? "",
  };
}

export async function listCalendarEvents(): Promise<CalendarEvent[]> {
  const cfg = getServerConfig();
  const now = Date.now();
  const timeMin = new Date(now - dashboardConfig.tours.calendarPastDays * 86_400_000).toISOString();
  const timeMax = new Date(now + dashboardConfig.tours.calendarFutureDays * 86_400_000).toISOString();
  const events: CalendarEvent[] = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      showDeleted: "false",
      maxResults: "2500",
      timeMin,
      timeMax,
      fields:
        "nextPageToken,items(id,summary,description,status,htmlLink,start,end,attachments(fileUrl,title,fileId),extendedProperties(private))",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cfg.google.calendarId)}/events?${params}`;
    const data = await googleJson(url);
    for (const item of (data.items as GoogleEvent[] | undefined) ?? []) {
      const mapped = mapGoogleEvent(item);
      if (mapped) events.push(mapped);
    }
    pageToken = typeof data.nextPageToken === "string" ? data.nextPageToken : "";
  } while (pageToken);
  return events;
}

export async function insertCalendarEvent(body: Record<string, unknown>): Promise<{ id: string; htmlLink: string }> {
  const cfg = getServerConfig();
  const query = calendarWriteQuery("create", Array.isArray(body.attachments));
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cfg.google.calendarId)}/events?${query}`;
  const data = await googleJson(url, { method: "POST", body: JSON.stringify(buildEventBodySafe(body)) });
  return { id: String(data.id ?? ""), htmlLink: String(data.htmlLink ?? "") };
}

function buildEventBodySafe(body: Record<string, unknown>): Record<string, unknown> {
  if ("conferenceData" in body || "conferenceDataVersion" in body) {
    throw new Error("Refusing to add or remove a Google Meet link.");
  }
  return body;
}

export async function patchCalendarTitle(eventId: string, title: string): Promise<void> {
  const cfg = getServerConfig();
  const query = calendarWriteQuery("update", false);
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cfg.google.calendarId)}/events/${encodeURIComponent(eventId)}?${query}`;
  await googleJson(url, { method: "PATCH", body: JSON.stringify(buildNoShowPatch(title)) });
}

export { buildEventBody };
