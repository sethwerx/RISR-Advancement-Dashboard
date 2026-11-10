const WEEKDAYS = new Set(["Mon", "Tue", "Wed", "Thu", "Fri"]);

export function bangkokParts(now: Date): { date: string; weekday: string; hour: number; minute: number } {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", weekday: "short" }).format(now);
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const [hour, minute] = clock.split(":").map(Number);
  return { date, weekday, hour, minute };
}

/** Weekdays at 05:55 Asia/Bangkok, once per date. */
export function shouldRunScheduledSync(now: Date, lastRunDate: string | null): boolean {
  const parts = bangkokParts(now);
  if (!WEEKDAYS.has(parts.weekday)) return false;
  if (parts.hour !== 5 || parts.minute !== 55) return false;
  return lastRunDate !== parts.date;
}
