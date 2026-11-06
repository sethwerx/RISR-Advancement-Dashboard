import { describe, expect, it } from "vitest";
import { ATTENDED_LABEL, attendanceLabel, normalizeAttendanceLabel, NO_SHOW_LABEL } from "@/lib/attendance";
import type { TourView } from "@/lib/types";

function tour(partial: Partial<TourView>): TourView {
  return {
    noShow: false,
    state: "scheduled",
    startIso: "2026-10-01T03:00:00.000Z",
    ...partial,
  } as TourView;
}

describe("attendance labels", () => {
  it("maps Show and Showed to Attended", () => {
    expect(normalizeAttendanceLabel("Show")).toBe(ATTENDED_LABEL);
    expect(normalizeAttendanceLabel("showed")).toBe(ATTENDED_LABEL);
    expect(normalizeAttendanceLabel("Showed")).toBe(ATTENDED_LABEL);
    expect(normalizeAttendanceLabel("Attended")).toBe(ATTENDED_LABEL);
    expect(normalizeAttendanceLabel("No show")).toBe(NO_SHOW_LABEL);
    expect(normalizeAttendanceLabel("no-show")).toBe(NO_SHOW_LABEL);
  });

  it("labels a past tour Attended and a no-show as No show", () => {
    const now = new Date("2026-11-02T10:00:00.000Z");
    expect(attendanceLabel(tour({ startIso: "2026-10-01T03:00:00.000Z" }), now)).toBe("Attended");
    expect(attendanceLabel(tour({ noShow: true, startIso: "2026-10-01T03:00:00.000Z" }), now)).toBe("No show");
    expect(attendanceLabel(tour({ startIso: "2026-12-01T03:00:00.000Z" }), now)).toBe("");
  });
});
