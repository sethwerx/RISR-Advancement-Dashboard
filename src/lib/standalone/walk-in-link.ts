/** Browser-only setting. A blank value uses the host default, which is empty on the iMac file. */
export const WALK_IN_URL_STORAGE_KEY = "risr.walkInUrl";

export const WALK_IN_BUTTON_LABEL = "Walk-in";
export const WALK_IN_UNSET_LABEL = "Walk-in app not set up yet";

export function walkInUrlStorageKey(): string {
  return WALK_IN_URL_STORAGE_KEY;
}

/** https only. The staff screen is a web app, never a file or an http page. */
export function normalizeWalkInUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * `saved` is null when this browser has no Walk-in URL stored.
 * A stored value replaces the host default. An empty default leaves the button unset.
 */
export function resolveWalkInUrl(saved: string | null, fallback: string): string {
  if (saved !== null) return normalizeWalkInUrl(saved) ?? "";
  return normalizeWalkInUrl(fallback) ?? "";
}

export function walkInButtonLabel(url: string): string {
  return url ? WALK_IN_BUTTON_LABEL : WALK_IN_UNSET_LABEL;
}

/** Same rule as Code.gs walkInPageUrl_. The deployed /exec address plus ?page=walkin. */
export function walkInPageUrl(webAppUrl: string): string {
  const base = webAppUrl.trim();
  if (!/^https:\/\//i.test(base)) return "";
  try {
    const url = new URL(base);
    if (url.username || url.password) return "";
  } catch {
    return "";
  }
  if (base.includes("?")) return `${base}&page=walkin`;
  return `${base}?page=walkin`;
}
