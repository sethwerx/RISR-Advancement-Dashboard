import type { OfficeSnapshot } from "@/lib/office/types";

const MARK = "snapshot-v1";
const CHUNK = 40000;

/** The master sheet keeps the snapshot because a host disk may be temporary. */
export function encodeSnapshot(snapshot: OfficeSnapshot): string[][] {
  const json = JSON.stringify(snapshot);
  const rows: string[][] = [[MARK]];
  for (let index = 0; index < json.length; index += CHUNK) rows.push([json.slice(index, index + CHUNK)]);
  return rows;
}

export function decodeSnapshot(values: string[][]): OfficeSnapshot | null {
  if (values[0]?.[0] !== MARK) return null;
  const json = values
    .slice(1)
    .map((row) => row[0] ?? "")
    .join("");
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as OfficeSnapshot;
    if (!parsed || typeof parsed !== "object" || !parsed.tabs) return null;
    return parsed;
  } catch {
    return null;
  }
}
