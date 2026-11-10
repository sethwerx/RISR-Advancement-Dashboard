import { describe, expect, it } from "vitest";
import { buildDescription, buildTourTitle } from "@/lib/title";
import { matchRegistrations, planSync } from "@/lib/match";
import { tourInterval } from "@/lib/time";
import type { CalendarEvent, HydratedRegistration } from "@/lib/types";

function registration(overrides: Partial<HydratedRegistration> = {}): HydratedRegistration {
  return {
    id: 9001,
    eventId: 22965,
    eventLabel: "ES/MS/HS",
    date: "2025-03-04",
    time: "10:00 AM",
    state: "scheduled",
    host: "Jordan Blake",
    campus: "Ratchapruek",
    note: "",
    attendeesCount: 2,
    students: [
      {
        id: 101,
        firstName: "Anan",
        lastName: "Siri",
        preferredName: "Nong",
        grade: "G3",
        status: "Inquiry",
        thaiNickname: "",
        profileUrl: "https://risr.openapply.com/admin/students/101",
      },
    ],
    parents: [],
    ...overrides,
  };
}

function eventFor(reg: HydratedRegistration, overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  const interval = tourInterval(reg.date, reg.time, 120);
  return {
    id: `evt-${reg.id}`,
    title: buildTourTitle(reg.students),
    description: buildDescription(
      reg.students.map((student) => student.id),
      reg.id,
    ),
    startIso: interval.start,
    endIso: interval.end,
    htmlLink: "",
    registrationId: reg.id,
    notesDocUrl: "",
    ...overrides,
  };
}

describe("registration matching", () => {
  it("treats a scheduled registration with no event as new", () => {
    const reg = registration();
    const matches = matchRegistrations([reg], [], 120);
    const plan = planSync(matches);
    expect(matches[0].status).toBe("missing");
    expect(plan.toCreate.map((item) => item.registration.id)).toEqual([9001]);
    expect(plan.flaggedRescheduled).toHaveLength(0);
    expect(plan.flaggedCanceled).toHaveLength(0);
  });

  it("treats a same-slot registration id as synced", () => {
    const reg = registration();
    const matches = matchRegistrations([reg], [eventFor(reg)], 120);
    const plan = planSync(matches);
    expect(matches[0].status).toBe("synced");
    expect(plan.toCreate).toHaveLength(0);
    expect(plan.synced).toHaveLength(1);
  });

  it("flags a reschedule and does not include it in creates", () => {
    const reg = registration({ date: "2025-03-11", time: "1:00 PM" });
    const stale = eventFor(registration(), { id: "evt-old" });
    const matches = matchRegistrations([reg], [stale], 120);
    const plan = planSync(matches);
    expect(matches[0].status).toBe("rescheduled");
    expect(plan.toCreate).toHaveLength(0);
    expect(plan.flaggedRescheduled.map((item) => item.registration.id)).toEqual([9001]);
    expect(Object.keys(plan).sort()).toEqual(["flaggedCanceled", "flaggedRescheduled", "synced", "toCreate"]);
  });

  it("flags a canceled registration that is still on the calendar and never creates one", () => {
    const reg = registration({ state: "canceled" });
    const withEvent = matchRegistrations([reg], [eventFor(reg)], 120);
    const withoutEvent = matchRegistrations([reg], [], 120);
    expect(withEvent[0].status).toBe("canceled");
    expect(planSync(withEvent).flaggedCanceled).toHaveLength(1);
    expect(planSync(withEvent).toCreate).toHaveLength(0);
    expect(withoutEvent[0].status).toBe("canceled");
    expect(planSync(withoutEvent).flaggedCanceled).toHaveLength(0);
    expect(planSync(withoutEvent).toCreate).toHaveLength(0);
  });

  it("falls back to student name and date when the registration id is missing", () => {
    const reg = registration();
    const legacy = eventFor(reg, {
      registrationId: null,
      description: "Campus visit for Anan Siri.",
      title: "School tour: Anan Siri (G3)",
    });
    const matches = matchRegistrations([reg], [legacy], 120);
    expect(matches[0].status).toBe("synced");
    expect(matches[0].event?.id).toBe("evt-9001");
  });

  it("does not use the name fallback on a different date", () => {
    const reg = registration({ date: "2025-04-01" });
    const legacy = eventFor(registration(), {
      registrationId: null,
      description: "Campus visit for Anan Siri.",
      title: "School tour: Anan Siri (G3)",
    });
    const matches = matchRegistrations([reg], [legacy], 120);
    expect(matches[0].status).toBe("missing");
    expect(matches[0].event).toBeNull();
  });

  it("requires every sibling name before a fallback match", () => {
    const reg = registration({
      students: [
        {
          id: 101,
          firstName: "Anan",
          lastName: "Siri",
          preferredName: "Nong",
          grade: "G3",
          status: "Inquiry",
          thaiNickname: "",
          profileUrl: "",
        },
        {
          id: 102,
          firstName: "Malee",
          lastName: "Siri",
          preferredName: "",
          grade: "G1",
          status: "Inquiry",
          thaiNickname: "",
          profileUrl: "",
        },
      ],
    });
    const onlyOne = eventFor(reg, {
      registrationId: null,
      description: "",
      title: "School tour: Anan Siri (G3)",
    });
    expect(matchRegistrations([reg], [onlyOne], 120)[0].event).toBeNull();
    const both = eventFor(reg, {
      registrationId: null,
      description: "",
      title: "School tour: Anan Siri (G3) & Malee Siri (G1)",
    });
    expect(matchRegistrations([reg], [both], 120)[0].status).toBe("synced");
  });
});
