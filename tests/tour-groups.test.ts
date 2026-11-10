import { describe, expect, it } from "vitest";
import type { LocalTour } from "@/lib/standalone/data";
import { groupToursByDay, tourCountLabel } from "@/lib/standalone/tour-groups";

function tour(date: string, time: string, students: string): LocalTour {
  return { id: `${date}-${time}-${students}`, date, time, students, grade: "G1", host: "Alex", status: "Scheduled", attendance: "", calendarEventId: "", title: students, note: "" };
}

describe("tour day groups", () => {
  it("groups upcoming days and sorts each day by start time", () => {
    const grouped = groupToursByDay(
      [
        tour("2026-11-12", "10:00 AM", "Later day"),
        tour("2026-11-11", "2:00 PM", "Afternoon"),
        tour("2026-11-11", "8:00 AM", "Morning"),
        tour("2026-11-10", "10:00 AM", "Yesterday"),
      ],
      "2026-11-11",
    );
    expect(grouped.upcoming.map((day) => day.heading)).toEqual(["Wednesday, 11 Nov 2026", "Thursday, 12 Nov 2026"]);
    expect(grouped.upcoming[0].tours.map((item) => item.students)).toEqual(["Morning", "Afternoon"]);
    expect(tourCountLabel(grouped.upcoming[0].tours.length)).toBe("2 tours");
    expect(tourCountLabel(1)).toBe("1 tour");
    expect(grouped.past.map((day) => [day.heading, day.tours.map((item) => item.students)])).toEqual([["Tuesday, 10 Nov 2026", ["Yesterday"]]]);
  });
});