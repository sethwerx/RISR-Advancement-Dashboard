import "server-only";

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { WalkInRecord } from "@/lib/walkin";

const file = path.join(process.cwd(), "data", "walk-ins.json");

export function readWalkInFile(): WalkInRecord[] {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as WalkInRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeWalkInFile(records: WalkInRecord[]) {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(records, null, 2), { mode: 0o600 });
  renameSync(tmp, file);
}
