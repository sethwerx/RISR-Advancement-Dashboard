export const openHouseDivisions = [
  { id: "PreK", title: "Pre-K", range: "Pre-K" },
  { id: "ES", title: "ES", range: "KG–G5" },
  { id: "MSHS", title: "MS/HS", range: "G6–12" },
] as const;

export type OpenHouseDivisionId = (typeof openHouseDivisions)[number]["id"];

export type OpenHouseDuplicateBody = {
  division: OpenHouseDivisionId;
  date: string;
  start: string | null;
  end: string | null;
  requested_at: string;
  source: "advancement-dashboard";
};

export type OpenHouseRequest = {
  division: OpenHouseDivisionId;
  date: string;
  requestedAt: string;
};

export const OPEN_HOUSE_RECENT_LIMIT = 6;

const URL_KEY = "risr.openHouseWebhookUrl";
const AUTH_KEY = "risr.openHouseAuthorization";
const RECENT_KEY = "risr.openHouseRecent";

export function openHouseUrlKey(): string {
  return URL_KEY;
}

export function openHouseAuthKey(): string {
  return AUTH_KEY;
}

export function openHouseRecentKey(): string {
  return RECENT_KEY;
}

export function openHouseDuplicateBody(input: { division: OpenHouseDivisionId; date: string; start: string; end: string; requestedAt: string }): OpenHouseDuplicateBody {
  const time = (value: string) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim()) ? value.trim() : null);
  return {
    division: input.division,
    date: input.date,
    start: time(input.start),
    end: time(input.end),
    requested_at: input.requestedAt,
    source: "advancement-dashboard",
  };
}

export function formatOpenHouseDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))));
}

export function openHouseConfirmText(title: string, date: string): string {
  return `Duplicate ${title} Open House to ${formatOpenHouseDate(date)}?`;
}

export function rememberOpenHouseRequest(current: OpenHouseRequest[], next: OpenHouseRequest): OpenHouseRequest[] {
  return [next, ...current].slice(0, OPEN_HOUSE_RECENT_LIMIT);
}

export function parseOpenHouseRecent(raw: string | null): OpenHouseRequest[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as OpenHouseRequest[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && openHouseDivisions.some((division) => division.id === item.division) && /^\d{4}-\d{2}-\d{2}$/.test(item.date) && typeof item.requestedAt === "string")
      .slice(0, OPEN_HOUSE_RECENT_LIMIT);
  } catch {
    return [];
  }
}

export const openHouseSuccessMessage = "Requested — you'll get a message in Grok Bot when the unpublished copy is ready (about 2–5 minutes)";
