import { parseClock } from "@/lib/time";
import type { LocalTour } from "@/lib/standalone/data";

export type TourDayGroup = {
  date: string;
  heading: string;
  tours: LocalTour[];
};

export function formatDayHeading(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date || "Date not recorded";
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function minutes(time: string): number {
  try {
    const parsed = parseClock(time);
    return parsed.hours * 60 + parsed.minutes;
  } catch {
    return 24 * 60 + 1;
  }
}

function groupsFrom(map: Map<string, LocalTour[]>, descending: boolean): TourDayGroup[] {
  return [...map.entries()]
    .sort((left, right) => (descending ? right[0].localeCompare(left[0]) : left[0].localeCompare(right[0])))
    .map(([date, dayTours]) => ({
      date,
      heading: formatDayHeading(date),
      tours: [...dayTours].sort((left, right) => minutes(left.time) - minutes(right.time) || left.students.localeCompare(right.students)),
    }));
}

/** Upcoming days run forward from today. Past days run backward. Times within a day run earliest first. */
export function groupToursByDay(tours: LocalTour[], today: string): { upcoming: TourDayGroup[]; past: TourDayGroup[] } {
  const upcoming = new Map<string, LocalTour[]>();
  const past = new Map<string, LocalTour[]>();
  for (const tour of tours) {
    const date = tour.date.trim();
    const bucket = !date || date >= today ? upcoming : past;
    const list = bucket.get(date) ?? [];
    list.push(tour);
    bucket.set(date, list);
  }
  return { upcoming: groupsFrom(upcoming, false), past: groupsFrom(past, true) };
}

export function tourCountLabel(count: number): string {
  return count === 1 ? "1 tour" : `${count} tours`;
}
