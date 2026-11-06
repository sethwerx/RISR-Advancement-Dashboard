import { describe, expect, it } from "vitest";
import { ictDate, parseClock, sameSlot, tourInterval, tourTimeLabel } from "@/lib/time";

describe("ICT tour times", () => {
  it("converts 10:00 AM local and a 120 minute duration", () => {
    const interval = tourInterval("2025-03-04", "10:00 AM", 120);
    expect(interval.start).toBe("2025-03-04T10:00:00+07:00");
    expect(interval.end).toBe("2025-03-04T12:00:00+07:00");
    expect(tourTimeLabel("2025-03-04", "10:00 AM", 120).label).toBe("10:00 AM – 12:00 PM");
    expect(sameSlot("2025-03-04", "10:00 AM", 120, interval.start, interval.end)).toBe(true);
    expect(sameSlot("2025-03-04", "11:00 AM", 120, interval.start, interval.end)).toBe(false);
  });

  it("treats 12:00 AM as midnight and 12:00 PM as noon", () => {
    expect(parseClock("12:00 AM")).toEqual({ hours: 0, minutes: 0 });
    expect(parseClock("12:30 AM")).toEqual({ hours: 0, minutes: 30 });
    expect(parseClock("12:00 PM")).toEqual({ hours: 12, minutes: 0 });
    expect(parseClock("12:30 PM")).toEqual({ hours: 12, minutes: 30 });
    expect(parseClock("1:30 PM")).toEqual({ hours: 13, minutes: 30 });
    expect(parseClock("10:00 am")).toEqual({ hours: 10, minutes: 0 });
    expect(tourInterval("2025-03-04", "12:00 AM", 120).start).toBe("2025-03-04T00:00:00+07:00");
    expect(tourInterval("2025-03-04", "12:00 PM", 120)).toEqual({
      start: "2025-03-04T12:00:00+07:00",
      end: "2025-03-04T14:00:00+07:00",
    });
  });

  it("rolls a late tour into the next ICT day", () => {
    expect(tourInterval("2025-03-04", "11:30 PM", 120)).toEqual({
      start: "2025-03-04T23:30:00+07:00",
      end: "2025-03-05T01:30:00+07:00",
    });
  });

  it("reads an ICT calendar date from a UTC instant", () => {
    expect(ictDate("2025-03-03T17:00:00.000Z")).toBe("2025-03-04");
    expect(ictDate("2025-03-04T02:59:00.000Z")).toBe("2025-03-04");
  });
});
