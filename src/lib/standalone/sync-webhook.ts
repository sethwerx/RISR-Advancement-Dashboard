const STORAGE_KEY = "risr.syncWebhookUrl";
const SCHEDULE_KEY = "risr.syncSchedule";

export const SYNC_TIMEZONE = "Asia/Bangkok" as const;

export const syncIntervals = ["manual", "weekdays", "daily", "hourly"] as const;
export type SyncInterval = (typeof syncIntervals)[number];

export type SyncSchedule = {
  date: string;
  time: string;
  interval: SyncInterval;
  everyHours: number;
  timezone: typeof SYNC_TIMEZONE;
};

export type SyncWebhookBody = {
  mode: "manual" | "schedule";
  date: string;
  time: string;
  interval: SyncInterval;
  everyHours: number;
  timezone: typeof SYNC_TIMEZONE;
};

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

export function scheduleStorageKey(): string {
  return SCHEDULE_KEY;
}

export function defaultSyncSchedule(): SyncSchedule {
  return { date: "", time: "05:55", interval: "weekdays", everyHours: 4, timezone: SYNC_TIMEZONE };
}

function clampHours(value: number): number {
  if (!Number.isFinite(value)) return 4;
  return Math.min(24, Math.max(1, Math.round(value)));
}

export function parseSyncSchedule(raw: string | null): SyncSchedule {
  const fallback = defaultSyncSchedule();
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<SyncSchedule>;
    const interval = syncIntervals.includes(parsed.interval as SyncInterval) ? (parsed.interval as SyncInterval) : fallback.interval;
    const time = typeof parsed.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(parsed.time) ? parsed.time : fallback.time;
    const date = typeof parsed.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : "";
    return { date, time, interval, everyHours: clampHours(Number(parsed.everyHours)), timezone: SYNC_TIMEZONE };
  } catch {
    return fallback;
  }
}

/** Sync Now is an immediate run. A saved cadence is included so the bot can read it. */
export function syncWebhookBody(schedule: SyncSchedule): SyncWebhookBody {
  return {
    mode: schedule.interval === "manual" ? "manual" : "schedule",
    date: schedule.date,
    time: schedule.time,
    interval: schedule.interval,
    everyHours: schedule.interval === "hourly" ? schedule.everyHours : 0,
    timezone: SYNC_TIMEZONE,
  };
}

export function describeSyncSchedule(schedule: SyncSchedule): string {
  const clock = `${schedule.time} Asia/Bangkok`;
  if (schedule.interval === "manual") return schedule.date ? `Manual only, one-off ${schedule.date} ${clock}` : "Manual only";
  if (schedule.interval === "weekdays") return `Weekdays at ${clock}`;
  if (schedule.interval === "daily") return `Daily at ${clock}`;
  return `Every ${schedule.everyHours} hours from ${clock}`;
}

export function latestSyncAt(entries: { at: string }[]): string {
  return entries.reduce((latest, entry) => (entry.at > latest ? entry.at : latest), "");
}

export function syncLogAdvanced(before: string, after: string): boolean {
  return Boolean(after) && after > before;
}
