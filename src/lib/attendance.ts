import type { TourView } from "@/lib/types";

export const ATTENDED_LABEL = "Attended";
export const NO_SHOW_LABEL = "No show";

/** Map older "Show" / "Showed" values onto the current attendance label. */
export function normalizeAttendanceLabel(value: string): string {
  const key = value.trim().toLowerCase().replace(/[_-]+/g, " ");
  if (key === "show" || key === "showed" || key === "attended") return ATTENDED_LABEL;
  if (key === "no show" || key === "noshow") return NO_SHOW_LABEL;
  return value.trim();
}

export function attendanceLabel(tour: Pick<TourView, "noShow" | "startIso" | "state">, now = new Date()): string {
  if (tour.noShow) return NO_SHOW_LABEL;
  if (tour.state === "canceled") return "";
  if (Date.parse(tour.startIso) < now.getTime()) return ATTENDED_LABEL;
  return "";
}
