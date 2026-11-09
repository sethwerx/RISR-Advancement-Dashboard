import { standaloneSheetTitles } from "@/lib/office/sheet-schema";
import { isSchoolEmail } from "@/lib/access";
import { readMasterSheets, studentListReadError, type MasterLoad } from "@/lib/standalone/data";
import { optionalStudentListTitles, studentListTabIsRequired } from "@/lib/standalone/student-years";
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
  return loadGis().then(
    () =>
      new Promise((resolve, reject) => {
        const client = window.google!.accounts.oauth2.initTokenClient({
          client_id: config.googleClientId,
          scope: "openid email https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/calendar",
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

async function sheetValues(token: string, spreadsheetId: string, title: string): Promise<{ values: string[][]; error: string }> {
  const range = `'${title.replaceAll("'", "''")}'!A1:AZ5000`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const detail = (await response.text()).replace(/\s+/g, " ").trim().slice(0, 240);
    if (studentListTabIsRequired(title)) return { values: [], error: studentListReadError(response.status, detail) };
    if (response.status === 400 || optionalStudentListTitles().includes(title)) return { values: [], error: "" };
    throw new Error(detail ? `Could not read “${title}” (HTTP ${response.status}). ${detail}` : `Could not read “${title}” (HTTP ${response.status}).`);
  }
  const payload = (await response.json()) as { values?: string[][] };
  return { values: payload.values ?? [], error: "" };
}

export async function loadMasterSheet(token: string, spreadsheetId: string): Promise<MasterLoad> {
  const sheets: Record<string, string[][]> = {};
  let studentListError = "";
  for (const title of [...standaloneSheetTitles, ...optionalStudentListTitles()]) {
    const read = await sheetValues(token, spreadsheetId, title);
    sheets[title] = read.values;
    if (title === "Student List" && read.error) studentListError = read.error;
  }
  return { ...readMasterSheets(sheets), studentListError };
}

export async function calendarWrite(token: string, calendarId: string, path: string, method: "POST" | "PATCH", body: Record<string, unknown>) {
  if ("conferenceData" in body) throw new Error("Calendar writes cannot include Meet.");
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}${path}?sendUpdates=none`;
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Calendar update failed (${response.status}).`);
  return (await response.json()) as { id?: string };
}
