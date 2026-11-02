import { dashboardConfig } from "@/config/dashboard.config";

const ZONE = dashboardConfig.school.timezone;

export function pad(value: number, width = 2): string {
  return String(value).padStart(width, "0");
}

export function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`;
}

export function todayIct(now = new Date()): string {
  return ictParts(now.toISOString()).date;
}

export function defaultMeetingWindow(now = new Date()): { from: string; to: string } {
  const today = todayIct(now);
  return {
    from: addCalendarDays(today, -dashboardConfig.tours.printDaysBefore),
    to: addCalendarDays(today, dashboardConfig.tours.printDaysAfter),
  };
}

/** Parse an OpenApply clock time. Accepts "10:00 AM" and 24-hour "14:00". */
export function parseClock(time: string): { hours: number; minutes: number } {
  const trimmed = time.trim().replace(/\s+/g, " ");
  const ampm = trimmed.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
  if (ampm) {
    let hours = Number(ampm[1]);
    const minutes = Number(ampm[2]);
    const meridiem = ampm[3].toUpperCase();
    if (hours < 1 || hours > 12 || minutes > 59) {
      throw new Error(`Invalid time "${time}"`);
    }
    if (meridiem === "AM") hours = hours === 12 ? 0 : hours;
    else hours = hours === 12 ? 12 : hours + 12;
    return { hours, minutes };
  }
  const h24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (h24) {
    const hours = Number(h24[1]);
    const minutes = Number(h24[2]);
    if (hours > 23 || minutes > 59) throw new Error(`Invalid time "${time}"`);
    return { hours, minutes };
  }
  throw new Error(`Invalid time "${time}"`);
}

export function formatClock(hours: number, minutes: number): string {
  const suffix = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${pad(minutes)} ${suffix}`;
}

function toIctIso(date: string, hours: number, minutes: number): string {
  const dayCarry = Math.floor(hours / 24);
  const hour = hours % 24;
  const resolved = dayCarry === 0 ? date : addCalendarDays(date, dayCarry);
  return `${resolved}T${pad(hour)}:${pad(minutes)}:00+07:00`;
}

/**
 * Convert an OpenApply local date + time into a 2-hour (or configured) ICT interval.
 * ICT is UTC+7 all year, so the offset is fixed.
 */
export function tourInterval(
  date: string,
  time: string,
  durationMinutes: number = dashboardConfig.tours.durationMinutes,
): { start: string; end: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Invalid date "${date}"`);
  const { hours, minutes } = parseClock(time);
  const start = toIctIso(date, hours, minutes);
  const total = hours * 60 + minutes + durationMinutes;
  const end = toIctIso(date, Math.floor(total / 60), total % 60);
  return { start, end };
}

export function tourTimeLabel(
  date: string,
  time: string,
  durationMinutes: number = dashboardConfig.tours.durationMinutes,
): { label: string; endTime: string; endDate: string } {
  const { end } = tourInterval(date, time, durationMinutes);
  const endDate = end.slice(0, 10);
  const endHours = Number(end.slice(11, 13));
  const endMinutes = Number(end.slice(14, 16));
  const startClock = parseClock(time);
  const startLabel = formatClock(startClock.hours, startClock.minutes);
  const endLabel = formatClock(endHours, endMinutes);
  const label = endDate === date ? `${startLabel} – ${endLabel}` : `${startLabel} – ${endLabel} (+1 day)`;
  return { label, endTime: endLabel, endDate };
}

export function ictParts(iso: string): { date: string; hours: number; minutes: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(new Date(iso))) map[part.type] = part.value;
  let hours = Number(map.hour);
  if (hours === 24) hours = 0;
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    hours,
    minutes: Number(map.minute),
  };
}

export function ictDate(iso: string): string {
  return ictParts(iso).date;
}

export function formatWhenFromIso(iso: string): string {
  const parts = ictParts(iso);
  return `${formatLongDate(parts.date)}, ${formatClock(parts.hours, parts.minutes)}`;
}

export function formatLongDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day, 5, 0, 0));
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(utc);
}

export function formatMonthKey(date: string): { key: string; label: string } {
  const [year, month] = date.split("-");
  const utc = new Date(Date.UTC(Number(year), Number(month) - 1, 15, 5, 0, 0));
  const label = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    month: "short",
    year: "numeric",
  }).format(utc);
  return { key: `${year}-${month}`, label };
}

export function formatIctTimestamp(iso: string): string {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
  return `${formatted} ICT`;
}

export function sameSlot(
  date: string,
  time: string,
  durationMinutes: number,
  eventStartIso: string,
  eventEndIso: string,
): boolean {
  const interval = tourInterval(date, time, durationMinutes);
  const startDiff = Math.abs(Date.parse(interval.start) - Date.parse(eventStartIso));
  const endDiff = Math.abs(Date.parse(interval.end) - Date.parse(eventEndIso));
  return startDiff < 60_000 && endDiff < 60_000;
}
