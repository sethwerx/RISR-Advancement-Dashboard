import "server-only";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { OfficeSnapshot } from "@/lib/office/types";

const snapshotFile = path.join(process.cwd(), "data", "office-snapshot.json");
const stampFile = path.join(process.cwd(), "data", "office-sync-stamp.json");

function ensureDir() {
  mkdirSync(path.dirname(snapshotFile), { recursive: true });
}

export function readOfficeSnapshot(): OfficeSnapshot | null {
  try {
    return JSON.parse(readFileSync(snapshotFile, "utf8")) as OfficeSnapshot;
  } catch {
    return null;
  }
}

export function writeOfficeSnapshot(snapshot: OfficeSnapshot) {
  ensureDir();
  writeFileSync(snapshotFile, JSON.stringify(snapshot), { mode: 0o600 });
}

export function readSyncStamp(): string | null {
  try {
    const parsed = JSON.parse(readFileSync(stampFile, "utf8")) as { date?: string };
    return parsed.date ?? null;
  } catch {
    return null;
  }
}

export function writeSyncStamp(date: string) {
  ensureDir();
  writeFileSync(stampFile, JSON.stringify({ date }), { mode: 0o600 });
}

export function masterSheetId(): string {
  if (process.env.GOOGLE_MASTER_SHEET_ID?.trim()) return process.env.GOOGLE_MASTER_SHEET_ID.trim();
  try {
    const parsed = JSON.parse(readFileSync(path.join(process.cwd(), "data", "sheet-id.json"), "utf8")) as { id?: string };
    return parsed.id ?? "";
  } catch {
    return "";
  }
}
