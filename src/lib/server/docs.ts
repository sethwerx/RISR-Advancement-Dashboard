import "server-only";

import { googleJson } from "@/lib/server/google-auth";
import { getServerConfig } from "@/lib/server/env";

export async function copyNotesDoc(name: string): Promise<{ id: string; url: string }> {
  const cfg = getServerConfig();
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(cfg.google.notesTemplateDocId)}/copy?supportsAllDrives=true`;
  const data = await googleJson(url, { method: "POST", body: JSON.stringify({ name }) });
  const id = String(data.id ?? "");
  if (!id) throw new Error("Google Drive did not return a notes document id.");
  return { id, url: `https://docs.google.com/document/d/${id}/edit` };
}

export async function trashFile(fileId: string): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`;
  await googleJson(url, { method: "PATCH", body: JSON.stringify({ trashed: true }) });
}

export function docIdFromUrl(url: string): string | null {
  const match = url.match(/\/document\/d\/([^/]+)/);
  return match?.[1] ?? null;
}

export async function appendToDoc(docId: string, text: string): Promise<void> {
  const current = await googleJson(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(docId)}`);
  const content =
    ((current.body as { content?: Array<{ endIndex?: number }> } | undefined)?.content ?? []);
  const end = content.length > 0 ? content[content.length - 1].endIndex ?? 2 : 2;
  const index = Math.max(1, end - 1);
  await googleJson(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(docId)}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [{ insertText: { location: { index }, text: `\n${text}\n` } }],
    }),
  });
}
