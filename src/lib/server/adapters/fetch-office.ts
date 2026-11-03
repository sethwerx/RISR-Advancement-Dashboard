import "server-only";

import { notionSources, sourceSheets } from "@/config/sources";
import { parseNotionPages, parseOaStudents, parseSheetTable, type NotionPage, type OaStudentJson } from "@/lib/server/adapters/parse";
import { getOpenApplyToken } from "@/lib/server/openapply";
import { getSheetsToken } from "@/lib/server/google-auth";
import { getServerConfig } from "@/lib/server/env";
import type { SourcePart } from "@/lib/office/types";

type FetchLike = typeof fetch;

function notionToken(): string {
  return process.env.NOTION_TOKEN?.trim() || "";
}

export function officeCredentialsReady(): boolean {
  const cfg = getServerConfig();
  const google = Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() || cfg.google.refreshToken || cfg.google.clientId);
  return Boolean(cfg.openApply.clientId && cfg.openApply.clientSecret && notionToken() && google);
}

/** Read-only. GET /students pages. The only OpenApply POST remains the token request. */
export async function fetchOaStudentParts(fetchImpl: FetchLike = fetch, token = ""): Promise<SourcePart[]> {
  const cfg = getServerConfig();
  const bearer = token || (await getOpenApplyToken());
  const parts: SourcePart[] = [];
  for (let page = 1; page <= 30; page += 1) {
    const url = `${cfg.openApply.baseUrl}/students?per_page=100&page=${page}`;
    const response = await fetchImpl(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${bearer}`,
        Accept: "application/json",
        "User-Agent": cfg.openApply.userAgent,
      },
    });
    if (!response.ok) throw new Error(`OpenApply student list failed (${response.status}).`);
    const payload = (await response.json()) as { students?: OaStudentJson[] };
    const batch = parseOaStudents(payload);
    parts.push(...batch);
    if (batch.length < 100) break;
  }
  return parts;
}

/** Read-only query. Notion's query endpoint is a POST that does not update pages. */
export async function fetchNotionParts(dataSourceId: string, source: string, fetchImpl: FetchLike = fetch, token = notionToken()): Promise<SourcePart[]> {
  if (!token) return [];
  const pages: NotionPage[] = [];
  let cursor: string | undefined;
  do {
    const response = await fetchImpl(`https://api.notion.com/v1/data_sources/${dataSourceId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": "2025-09-03",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cursor ? { start_cursor: cursor } : {}),
    });
    if (!response.ok) throw new Error(`Notion query failed (${response.status}).`);
    const payload = (await response.json()) as { results?: NotionPage[]; has_more?: boolean; next_cursor?: string | null };
    pages.push(...(payload.results ?? []));
    cursor = payload.has_more ? payload.next_cursor ?? undefined : undefined;
  } while (cursor);
  return parseNotionPages(pages, source);
}

/** Read-only spreadsheet values.get. Source sheets are never updated. */
export async function fetchSheetParts(spreadsheetId: string, range: string, source: string, headerNeedles: string[], fetchImpl: FetchLike = fetch, token = ""): Promise<SourcePart[]> {
  const bearer = token || (await getSheetsToken());
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`;
  const response = await fetchImpl(url, { method: "GET", headers: { Authorization: `Bearer ${bearer}` } });
  if (!response.ok) throw new Error(`Source sheet read failed (${response.status}).`);
  const payload = (await response.json()) as { values?: string[][] };
  return parseSheetTable(payload.values ?? [], source, headerNeedles);
}

export async function loadLiveParts(): Promise<SourcePart[]> {
  const [students, pipeline, notionStudents, weena, withdrawals, alumni, scholarships] = await Promise.all([
    fetchOaStudentParts(),
    fetchNotionParts(notionSources.pipeline, "notion-pipeline"),
    fetchNotionParts(notionSources.studentList2526, "notion-students"),
    fetchSheetParts(sourceSheets.studentList2627, "A1:Z400", "weena", ["No.", "First Name"]),
    fetchSheetParts(sourceSheets.withdrawals2627, "A1:Z80", "withdrawal", ["Name", "Reason Stated by Parents"]),
    fetchSheetParts(sourceSheets.alumniLatest, "Alumni!A1:Z80", "alumni", ["First Name", "Graduating Year"]),
    fetchSheetParts(sourceSheets.scholarshipList, "6Mar26!A1:Z500", "finance", ["First Name", "Discount Type"]),
  ]);
  return [...students, ...pipeline, ...notionStudents, ...weena, ...withdrawals, ...alumni, ...scholarships];
}
