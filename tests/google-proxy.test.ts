import { describe, expect, it } from "vitest";
import { assertCalendarRequest, assertWebhookRequest, isAllowedGoogleApiUrl } from "@/lib/standalone/google-proxy";

const calendar = "https://www.googleapis.com/calendar/v3/calendars/cal/events?sendUpdates=none";

describe("Google proxy rules", () => {
  it("requires sendUpdates=none and keeps a registration id off new events", () => {
    expect(() => assertCalendarRequest("POST", calendar, "{\"summary\":\"Tour\"}")).not.toThrow();
    expect(() => assertCalendarRequest("POST", calendar.replace("none", "all"), "{}")).toThrow(/sendUpdates=none/);
    expect(() => assertCalendarRequest("PATCH", "https://www.googleapis.com/calendar/v3/calendars/cal/events/abc", "{}")).toThrow(/sendUpdates=none/);
    expect(() => assertCalendarRequest("POST", calendar, "{\"conferenceData\":{}}")).toThrow(/cannot include Meet/);
    expect(() => assertCalendarRequest("POST", calendar, "OA Registration ID: 42")).toThrow(/OpenApply Registration ID/);
    expect(() => assertCalendarRequest("PATCH", calendar, "Notes\nOA Registration ID: 42")).not.toThrow();
    expect(() => assertCalendarRequest("GET", "https://www.googleapis.com/calendar/v3/calendars/cal/events/abc", "")).not.toThrow();
  });

  it("allows the dashboard Google APIs and ordinary https webhooks", () => {
    expect(isAllowedGoogleApiUrl("https://sheets.googleapis.com/v4/spreadsheets/abc/values/A1")).toBe(true);
    expect(isAllowedGoogleApiUrl("https://docs.googleapis.com/v1/documents/abc:batchUpdate")).toBe(true);
    expect(isAllowedGoogleApiUrl(calendar)).toBe(true);
    expect(isAllowedGoogleApiUrl("https://www.googleapis.com/oauth2/v3/userinfo")).toBe(true);
    expect(isAllowedGoogleApiUrl("https://gmail.googleapis.com/gmail/v1/users/me/messages")).toBe(false);
    expect(isAllowedGoogleApiUrl("https://user:pw@sheets.googleapis.com/v4/spreadsheets/abc")).toBe(false);
    expect(() => assertWebhookRequest("https://example.com/hook", "POST")).not.toThrow();
    expect(() => assertWebhookRequest("http://example.com/hook", "POST")).toThrow(/https/);
    expect(() => assertWebhookRequest("https://sheets.googleapis.com/v4/spreadsheets/abc", "POST")).toThrow(/not a webhook/);
    expect(() => assertWebhookRequest("https://127.0.0.1/hook", "POST")).toThrow(/not a webhook/);
    expect(() => assertWebhookRequest("https://example.com/hook", "GET")).toThrow(/POST/);
  });
});
