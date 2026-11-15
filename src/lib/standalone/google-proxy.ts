const GOOGLE_HOSTS = new Set(["sheets.googleapis.com", "www.googleapis.com", "docs.googleapis.com"]);

export function assertCalendarRequest(method: string, url: string, body: string): void {
  const upper = method.toUpperCase();
  if (upper === "GET" || upper === "HEAD") return;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Calendar writes must use sendUpdates=none.");
  }
  const sendUpdates = parsed.searchParams.get("sendUpdates");
  if (sendUpdates !== "none") throw new Error("Calendar writes must use sendUpdates=none.");
  if (/conferenceData/i.test(body) || /hangoutLink/i.test(body)) throw new Error("Calendar writes cannot include Meet.");
  if (upper === "POST" && /OA Registration ID\s*:/i.test(body)) {
    throw new Error("Tour calendar events cannot include an OpenApply Registration ID.");
  }
}

export function isAllowedGoogleApiUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password) return false;
  if (!GOOGLE_HOSTS.has(url.hostname)) return false;
  if (url.hostname === "sheets.googleapis.com") return url.pathname.startsWith("/v4/spreadsheets/");
  if (url.hostname === "docs.googleapis.com") return url.pathname.startsWith("/v1/documents/");
  if (url.pathname.startsWith("/calendar/v3/calendars/")) return true;
  return url.pathname === "/oauth2/v3/userinfo";
}

function privateOrLocalHost(hostname: string): boolean {
  const name = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (name === "localhost" || name.endsWith(".localhost") || name.endsWith(".local")) return true;
  if (name === "metadata.google.internal" || name === "metadata.google.internal.") return true;
  const ipv4 = name.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const parts = ipv4.slice(1).map(Number);
  if (parts.some((part) => part > 255)) return true;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

/** The Open House and OA tours webhooks. https only, and never a Google API host. */
export function assertWebhookRequest(url: string, method: string): void {
  if (method.toUpperCase() !== "POST") throw new Error("Webhooks only accept POST.");
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("The webhook URL must be https.");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error("The webhook URL must be https.");
  if (GOOGLE_HOSTS.has(parsed.hostname) || privateOrLocalHost(parsed.hostname)) throw new Error("That address is not a webhook.");
}
