const STORAGE_KEY = "risr.syncWebhookUrl";

/** https URL only. The value stays in the browser; it is never written into the repo. */
export function normalizeWebhookUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function webhookStorageKey(): string {
  return STORAGE_KEY;
}

export function latestSyncAt(entries: { at: string }[]): string {
  return entries.reduce((latest, entry) => (entry.at > latest ? entry.at : latest), "");
}

export function syncLogAdvanced(before: string, after: string): boolean {
  return Boolean(after) && after > before;
}
