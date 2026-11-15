import { isSchoolEmail } from "@/lib/access";
import { readMasterSheets, type MasterLoad } from "@/lib/standalone/data";
import { TOUR_NOTES_TEMPLATE_DOC_ID, docEndIndex, plainTextFromDoc } from "@/lib/standalone/tour-notes";
import { APPS_SCRIPT_TOKEN, appsScriptHost, runAppsScript, type AppsScriptBootstrap } from "@/lib/standalone/apps-script-host";
import { assertCalendarRequest, isAllowedGoogleApiUrl } from "@/lib/standalone/google-proxy";
import { chunkList, interpretSheetResponse, masterSheetReadTitles, SHEET_READ_BATCH, sheetA1Range } from "@/lib/standalone/sheet-read";
import liveConfig from "./live-config.json";

export type OfficeConfig = {
  googleClientId: string;
  masterSheetId: string;
  calendarId: string;
  allowedDomain: string;
  organizerEmail: string;
};

type TokenClient = { requestAccessToken: (override?: { prompt?: string }) => void };

declare global {
  interface Window {
    ADVANCEMENT_OFFICE_CONFIG?: Partial<OfficeConfig>;
    __BRAND?: { white: string; navy: string };
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            hosted_domain?: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => TokenClient;
          revoke: (token: string) => void;
        };
      };
    };
  }
}

export function readConfig(): OfficeConfig {
  const raw = window.ADVANCEMENT_OFFICE_CONFIG ?? {};
  return {
    googleClientId: raw.googleClientId?.trim() || liveConfig.googleClientId,
    masterSheetId: raw.masterSheetId?.trim() || liveConfig.masterSheetId,
    calendarId: raw.calendarId?.trim() || liveConfig.calendarId,
    allowedDomain: (raw.allowedDomain || liveConfig.allowedDomain).replace(/^@/, ""),
    organizerEmail: raw.organizerEmail?.trim() || liveConfig.organizerEmail,
  };
}

export function fileProtocolBlocked(): boolean {
  return location.protocol === "file:";
}

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("The Google sign-in script did not load."));
    document.head.appendChild(script);
  });
}

export function requestSchoolToken(config: OfficeConfig): Promise<string> {
  if (appsScriptHost()) {
    return runAppsScript<AppsScriptBootstrap>("clientBootstrap").then((boot) => {
      window.ADVANCEMENT_OFFICE_APPS_SCRIPT = {
        email: (boot?.email || "").toLowerCase(),
        walkInUrl: boot?.walkInUrl || "",
      };
      return APPS_SCRIPT_TOKEN;
    });
  }
  return loadGis().then(
    () =>
      new Promise((resolve, reject) => {
        const client = window.google!.accounts.oauth2.initTokenClient({
          client_id: config.googleClientId,
          scope: "openid email https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/documents",
          hosted_domain: config.allowedDomain,
          callback: (response) => {
            if (!response.access_token) {
              reject(new Error(response.error || "Google did not return a token."));
              return;
            }
            resolve(response.access_token);
          },
        });
        client.requestAccessToken({ prompt: "select_account" });
      }),
  );
}

export async function assertSchoolAccount(token: string, domain: string): Promise<string> {
  if (token === APPS_SCRIPT_TOKEN) {
    const email = (window.ADVANCEMENT_OFFICE_APPS_SCRIPT?.email ?? "").toLowerCase();
    if (email && !isSchoolEmail(email, domain)) throw new Error(`Sign in with a @${domain} account.`);
    return email;
  }
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Could not read the Google account.");
  const payload = (await response.json()) as { email?: string };
  const email = (payload.email ?? "").toLowerCase();
  if (!isSchoolEmail(email, domain)) {
    window.google?.accounts.oauth2.revoke(token);
    throw new Error(`Sign in with a @${domain} account.`);
  }
  return email;
}

type RemoteResponse = { ok: boolean; status: number; text: string };

async function authorizedFetch(token: string, url: string, init: { method?: "GET" | "POST" | "PATCH"; body?: string } = {}): Promise<RemoteResponse> {
  const method = init.method || "GET";
  if (token === APPS_SCRIPT_TOKEN) {
    if (!isAllowedGoogleApiUrl(url)) throw new Error("That Google address is not used by this dashboard.");
    const result = await runAppsScript<{ status?: number; body?: string }>("proxyApi", [
      { purpose: "google", url, method, body: init.body || "" },
    ]);
    const status = Number(result?.status) || 0;
    return { ok: status >= 200 && status < 300, status, text: result?.body ?? "" };
  }
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body,
  });
  return { ok: response.ok, status: response.status, text: await response.text() };
}

async function sheetValues(token: string, spreadsheetId: string, title: string): Promise<{ values: string[][]; error: string }> {
  const range = sheetA1Range(title);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`;
  const response = await authorizedFetch(token, url);
  if (!response.ok) return interpretSheetResponse(title, response.status, [], response.text);
  const payload = JSON.parse(response.text || "{}") as { values?: string[][] };
  return { values: payload.values ?? [], error: "" };
}

async function loadMasterSheetViaAppsScript(spreadsheetId: string): Promise<MasterLoad> {
  const sheets: Record<string, string[][]> = {};
  let studentListError = "";
  for (const chunk of chunkList(masterSheetReadTitles(), SHEET_READ_BATCH)) {
    const rows = await runAppsScript<Array<{ title: string; status: number; values?: string[][]; detail?: string }>>("readSheetBatch", [spreadsheetId, chunk]);
    if (!Array.isArray(rows)) throw new Error("The master sheet read did not return a list.");
    for (const row of rows) {
      const interpreted = interpretSheetResponse(row.title, Number(row.status) || 0, row.values, row.detail || "");
      sheets[row.title] = interpreted.values;
      if (row.title === "Student List" && interpreted.error) studentListError = interpreted.error;
    }
  }
  return { ...readMasterSheets(sheets), studentListError };
}

export async function loadMasterSheet(token: string, spreadsheetId: string): Promise<MasterLoad> {
  if (token === APPS_SCRIPT_TOKEN) return loadMasterSheetViaAppsScript(spreadsheetId);
  const sheets: Record<string, string[][]> = {};
  let studentListError = "";
  for (const title of masterSheetReadTitles()) {
    const read = await sheetValues(token, spreadsheetId, title);
    sheets[title] = read.values;
    if (title === "Student List" && read.error) studentListError = read.error;
  }
  return { ...readMasterSheets(sheets), studentListError };
}

export async function readCalendarEvent(token: string, calendarId: string, eventId: string): Promise<{ description: string; updated: string; attachments: Array<{ title?: string; fileId?: string; fileUrl?: string }> }> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
  const response = await authorizedFetch(token, url);
  if (!response.ok) throw new Error(`Could not read the calendar event (HTTP ${response.status}).`);
  const payload = JSON.parse(response.text || "{}") as { description?: string; updated?: string; attachments?: Array<{ title?: string; fileId?: string; fileUrl?: string }> };
  return { description: payload.description ?? "", updated: payload.updated ?? "", attachments: payload.attachments ?? [] };
}

export async function readTourNotesDoc(token: string, docId: string): Promise<{ text: string; endIndex: number }> {
  if (docId === TOUR_NOTES_TEMPLATE_DOC_ID) return { text: "", endIndex: 2 };
  const response = await authorizedFetch(token, `https://docs.googleapis.com/v1/documents/${encodeURIComponent(docId)}`);
  if (!response.ok) throw new Error(`Could not read the Tour Notes doc (HTTP ${response.status}).`);
  const doc = JSON.parse(response.text || "{}") as { body?: { content?: Array<{ endIndex?: number; paragraph?: { elements?: Array<{ textRun?: { content?: string } }> } }> } };
  return { text: plainTextFromDoc(doc), endIndex: docEndIndex(doc) };
}

export async function writeTourNotesDoc(token: string, docId: string, text: string, endIndex: number): Promise<void> {
  if (docId === TOUR_NOTES_TEMPLATE_DOC_ID) throw new Error("The tour notes template is not editable from the dashboard.");
  const requests: Record<string, unknown>[] = [];
  if (endIndex > 2) requests.push({ deleteContentRange: { range: { startIndex: 1, endIndex: endIndex - 1 } } });
  requests.push({ insertText: { location: { index: 1 }, text: text.endsWith("\n") ? text : `${text}\n` } });
  const response = await authorizedFetch(token, `https://docs.googleapis.com/v1/documents/${encodeURIComponent(docId)}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ requests }),
  });
  if (!response.ok) throw new Error(`Could not update the Tour Notes doc (HTTP ${response.status}).`);
}

export async function calendarWrite(token: string, calendarId: string, path: string, method: "POST" | "PATCH", body: Record<string, unknown>) {
  if ("conferenceData" in body) throw new Error("Calendar writes cannot include Meet.");
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}${path}?sendUpdates=none`;
  const payload = JSON.stringify(body);
  assertCalendarRequest(method, url, payload);
  const response = await authorizedFetch(token, url, { method, body: payload });
  if (!response.ok) throw new Error(`Calendar update failed (${response.status}).`);
  return JSON.parse(response.text || "{}") as { id?: string };
}
