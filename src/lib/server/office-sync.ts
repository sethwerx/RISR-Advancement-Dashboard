import "server-only";

import { sourceSheets } from "@/config/sources";
import { buildSnapshot, snapshotGrids } from "@/lib/office/build";
import { joinPeople } from "@/lib/office/join";
import { bangkokParts } from "@/lib/office/schedule";
import { fictionalSnapshot } from "@/lib/office/sample";
import type { OfficeSnapshot, SyncLogEntry } from "@/lib/office/types";
import { loadLiveParts, officeCredentialsReady } from "@/lib/server/adapters/fetch-office";
import { getSheetsToken } from "@/lib/server/google-auth";
import { errorMessage } from "@/lib/redact";
import { masterSheetId, readOfficeSnapshot, writeOfficeSnapshot, writeSyncStamp } from "@/lib/server/office-store";
import { writeDashboardSheet } from "@/lib/server/sheets";
import { getTours } from "@/lib/server/service";

const sourceIds = new Set<string>(Object.values(sourceSheets));

async function sheetsJson(url: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const token = await getSheetsToken();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(url, { ...init, headers, cache: "no-store" });
  if (!response.ok) throw new Error(`Master sheet request failed (${response.status}).`);
  return (await response.json()) as Record<string, unknown>;
}

/** Writes dashboard snapshots to the master spreadsheet only. Source files are refused. */
export async function writeMasterSnapshot(snapshot: OfficeSnapshot): Promise<string> {
  const id = masterSheetId();
  if (!id) return "Master sheet id is not set. Snapshot saved locally only.";
  if (sourceIds.has(id)) throw new Error("Refusing to write a source spreadsheet.");
  const meta = await sheetsJson(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}?fields=sheets.properties`);
  const existing = ((meta.sheets as Array<{ properties?: { title?: string } }> | undefined) ?? []).map((sheet) => String(sheet.properties?.title ?? ""));
  const grids = snapshotGrids(snapshot);
  const missing = grids.filter((grid) => !existing.includes(grid.title));
  if (missing.length > 0) {
    await sheetsJson(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        requests: missing.map((grid) => ({ addSheet: { properties: { title: grid.title, gridProperties: { frozenRowCount: 1 } } } })),
      }),
    });
  }
  for (const grid of grids) {
    const range = `'${grid.title.replaceAll("'", "''")}'!A1`;
    await sheetsJson(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(id)}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        body: JSON.stringify({ range, majorDimension: "ROWS", values: grid.values }),
      },
    );
  }
  return "Wrote the master sheet tabs and Sync Log.";
}

export async function refreshOffice(trigger: "manual" | "schedule"): Promise<OfficeSnapshot> {
  const previous = readOfficeSnapshot();
  const at = new Date().toISOString();
  let snapshot: OfficeSnapshot;
  let note: string;
  if (!officeCredentialsReady()) {
    snapshot = fictionalSnapshot(at);
    note = "Sample data. OpenApply, Notion, or Google credentials are missing, so the master sheet was not written.";
  } else {
    const people = joinPeople(await loadLiveParts());
    snapshot = buildSnapshot(people, { mock: false, at, log: [] });
    try {
      note = await writeMasterSnapshot(snapshot);
    } catch (error) {
      note = `Live read succeeded. Master sheet write failed: ${errorMessage(error)}`;
    }
    try {
      const tours = await getTours();
      if (!tours.mock) {
        await writeDashboardSheet(tours.tours, tours.log, { force: true });
        note = `${note} Tour sheet refreshed.`;
      }
    } catch (error) {
      note = `${note} Tour sheet skipped: ${errorMessage(error)}`;
    }
  }
  const rows = Object.values(snapshot.tabs).reduce((sum, tab) => sum + tab.rows.length, 0);
  const entry: SyncLogEntry = {
    at,
    scope: trigger === "schedule" ? "weekday 05:55 ICT" : "Refresh now",
    rows,
    mode: snapshot.mock ? "sample" : "live",
    note,
  };
  snapshot.syncLog = [...(previous?.syncLog ?? []), entry].slice(-40);
  writeOfficeSnapshot(snapshot);
  writeSyncStamp(bangkokParts(new Date()).date);
  return snapshot;
}

export function currentSnapshot(): OfficeSnapshot {
  return readOfficeSnapshot() ?? fictionalSnapshot();
}
