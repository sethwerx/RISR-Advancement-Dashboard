import type { CalendarEvent, HydratedRegistration, SyncStatus } from "@/lib/types";
import { extractRegistrationId } from "@/lib/title";
import { ictDate, sameSlot } from "@/lib/time";

export type MatchResult = {
  registration: HydratedRegistration;
  event: CalendarEvent | null;
  status: SyncStatus;
};

export type SyncPlan = {
  toCreate: MatchResult[];
  flaggedRescheduled: MatchResult[];
  flaggedCanceled: MatchResult[];
  synced: MatchResult[];
};

export function eventRegistrationId(event: CalendarEvent): number | null {
  if (event.registrationId != null) return event.registrationId;
  return extractRegistrationId(event.description);
}

export function namesAndDateMatch(event: CalendarEvent, registration: HydratedRegistration): boolean {
  if (ictDate(event.startIso) !== registration.date) return false;
  const haystack = event.title.toLowerCase();
  if (registration.students.length === 0) return false;
  return registration.students.every((student) => {
    const first = student.firstName.trim().toLowerCase();
    const last = student.lastName.trim().toLowerCase();
    return first.length > 0 && last.length > 0 && haystack.includes(first) && haystack.includes(last);
  });
}

function pickBest(
  registration: HydratedRegistration,
  candidates: CalendarEvent[],
  durationMinutes: number,
): CalendarEvent | null {
  if (candidates.length === 0) return null;
  return (
    candidates.find((event) =>
      sameSlot(registration.date, registration.time, durationMinutes, event.startIso, event.endIso),
    ) ?? candidates[0]
  );
}

export function statusFor(
  registration: HydratedRegistration,
  event: CalendarEvent | null,
  durationMinutes: number,
): SyncStatus {
  if (registration.state === "canceled") return "canceled";
  if (!event) return "missing";
  if (!sameSlot(registration.date, registration.time, durationMinutes, event.startIso, event.endIso)) {
    return "rescheduled";
  }
  return "synced";
}

/**
 * Match OA registrations to calendar events.
 * 1. OA Registration ID on the event (extended property or description bullet).
 * 2. Otherwise student name + ICT date, for older events that predate the id bullet.
 * An event is used at most once.
 */
export function matchRegistrations(
  registrations: HydratedRegistration[],
  events: CalendarEvent[],
  durationMinutes: number,
): MatchResult[] {
  const byId = new Map<number, CalendarEvent[]>();
  const unmatched: CalendarEvent[] = [];
  for (const event of events) {
    const id = eventRegistrationId(event);
    if (id == null) {
      unmatched.push(event);
      continue;
    }
    const list = byId.get(id) ?? [];
    list.push(event);
    byId.set(id, list);
  }

  const used = new Set<string>();
  return registrations.map((registration) => {
    let event = pickBest(registration, byId.get(registration.id) ?? [], durationMinutes);
    if (event) used.add(event.id);
    if (!event) {
      const fallback = unmatched.find((candidate) => !used.has(candidate.id) && namesAndDateMatch(candidate, registration));
      if (fallback) {
        event = fallback;
        used.add(fallback.id);
      }
    }
    return {
      registration,
      event,
      status: statusFor(registration, event, durationMinutes),
    };
  });
}

/**
 * Create calendar events only for scheduled registrations that are missing.
 * Rescheduled and canceled events already on the calendar are flagged and never moved or deleted.
 */
export function planSync(matches: MatchResult[]): SyncPlan {
  return {
    toCreate: matches.filter((match) => match.registration.state === "scheduled" && match.status === "missing"),
    flaggedRescheduled: matches.filter((match) => match.status === "rescheduled"),
    flaggedCanceled: matches.filter((match) => match.status === "canceled" && match.event),
    synced: matches.filter((match) => match.status === "synced"),
  };
}
