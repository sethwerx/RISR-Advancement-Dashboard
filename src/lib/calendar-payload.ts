import { dashboardConfig } from "@/config/dashboard.config";

export type CalendarWriteAction = "create" | "update";

/**
 * Creating a tour may send the normal guest invite.
 * Every later edit must pass sendUpdates=none so families are not emailed again.
 */
export function sendUpdatesFor(action: CalendarWriteAction): "all" | "none" {
  return action === "create" ? "all" : "none";
}

export function calendarWriteQuery(action: CalendarWriteAction, withAttachments: boolean): string {
  const params = new URLSearchParams();
  params.set("sendUpdates", sendUpdatesFor(action));
  if (withAttachments) params.set("supportsAttachments", "true");
  return params.toString();
}

export function assertNoConferenceFields(body: Record<string, unknown>): void {
  if ("conferenceData" in body || "conferenceDataVersion" in body) {
    throw new Error("Refusing to add or remove a Google Meet link.");
  }
}

export function buildEventBody(input: {
  title: string;
  description: string;
  startIso: string;
  endIso: string;
  guests: string[];
  registrationId: number;
  notes?: { fileId: string; fileUrl: string };
  timeZone?: string;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    summary: input.title,
    description: input.description,
    start: { dateTime: input.startIso, timeZone: input.timeZone ?? dashboardConfig.school.timezone },
    end: { dateTime: input.endIso, timeZone: input.timeZone ?? dashboardConfig.school.timezone },
    attendees: input.guests.map((email) => ({ email })),
    extendedProperties: {
      private: { oaRegistrationId: String(input.registrationId) },
    },
  };
  if (input.notes) {
    body.attachments = [
      {
        fileUrl: input.notes.fileUrl,
        title: "Tour Notes",
        mimeType: "application/vnd.google-apps.document",
        fileId: input.notes.fileId,
      },
    ];
  }
  assertNoConferenceFields(body);
  return body;
}

export function buildNoShowPatch(title: string): Record<string, unknown> {
  const body = { summary: title };
  assertNoConferenceFields(body);
  return body;
}

/** Later edits send only the description. Conference data is never included. */
export function buildDescriptionPatch(description: string): Record<string, unknown> {
  const body = { description };
  assertNoConferenceFields(body);
  return body;
}

export function buildWalkInEventBody(input: {
  title: string;
  description: string;
  startIso: string;
  endIso: string;
  guests: string[];
  walkInId: number;
  notes?: { fileId: string; fileUrl: string };
  timeZone?: string;
}): Record<string, unknown> {
  const body: Record<string, unknown> = {
    summary: input.title,
    description: input.description,
    start: { dateTime: input.startIso, timeZone: input.timeZone ?? dashboardConfig.school.timezone },
    end: { dateTime: input.endIso, timeZone: input.timeZone ?? dashboardConfig.school.timezone },
    attendees: input.guests.map((email) => ({ email })),
    extendedProperties: {
      private: { walkInId: String(input.walkInId) },
    },
  };
  if (input.notes) {
    body.attachments = [
      {
        fileUrl: input.notes.fileUrl,
        title: "Tour Notes",
        mimeType: "application/vnd.google-apps.document",
        fileId: input.notes.fileId,
      },
    ];
  }
  assertNoConferenceFields(body);
  return body;
}
