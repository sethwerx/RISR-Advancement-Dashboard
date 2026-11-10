import { describe, expect, it } from "vitest";
import {
  missingNewStudentsMessage,
  newStudentIsInactive,
  newStudentSummary,
  readAssessments,
  readNewStudentYears,
  readScheduleBundle,
  splitAssessments,
  suggestWidaSlots,
  widaCalendarTitle,
} from "@/lib/standalone/schedule";

const assessmentHeader = ["Date", "Start", "End", "Student", "Grade", "Tests", "Assessor", "Location", "Status", "Event ID", "Calendar", "Last synced", "Calendar link", "Raw title", "Parse notes"];

describe("assessments and new students", () => {
  it("groups upcoming assessments by day and keeps postponed separate", () => {
    const rows = readAssessments([
      assessmentHeader,
      ["2026-11-12", "10:00 AM", "11:30 AM", "Bea Example", "Grade 3", "WIDA, MAP", "Ms. Cheyn Saladaga", "Room 1", "Upcoming", "e2", "", "", "https://calendar.example/e2", "", ""],
      ["2026-11-12", "8:00 AM", "9:30 AM", "Ada Example", "Grade 2", "WIDA", "Cheyn", "Room 1", "Upcoming", "e1", "", "", "https://calendar.example/e1", "", ""],
      ["2026-08-02", "9:00 AM", "10:00 AM", "Past Example", "Grade 4", "WIDA", "Cheyn", "", "Done", "", "", "", "", "", ""],
      ["2026-07-01", "9:00 AM", "10:00 AM", "Too Early", "Grade 4", "WIDA", "Cheyn", "", "Done", "", "", "", "", "", ""],
      ["2026-11-20", "9:00 AM", "10:00 AM", "Later Example", "Grade 5", "WIDA", "Cheyn", "", "Postponed", "", "", "", "", "", ""],
    ]);
    const split = splitAssessments(rows, "2026-11-11");
    expect(split.upcoming[0].heading).toBe("Thursday, 12 Nov 2026 · 2 assessments");
    expect(split.upcoming[0].items.map((item) => item.student)).toEqual(["Ada Example", "Bea Example"]);
    expect(split.past.map((day) => day.items.map((item) => item.student))).toEqual([["Past Example"]]);
    expect(split.postponed.map((item) => item.student)).toEqual(["Later Example"]);
  });

  it("suggests the next WIDA slots and skips a busy assessor", () => {
    expect(suggestWidaSlots({ student: "Ada", grade: "KG", test: "WIDA", duration: 90, today: "2026-11-11", teachers: [], rotation: [], blocks: [], assessments: [] }).message).toBe("No ELD teacher for this grade");
    const suggestion = suggestWidaSlots({
      student: "Ada Example",
      grade: "Grade 2",
      test: "WIDA",
      duration: 90,
      today: "2026-11-11",
      teachers: [{ teacher: "Ms. Cheyn Saladaga", email: "cheyn@risr.ac.th", grades: ["Grade 2, Grade 3".split(",")[0], "Grade 3"], notes: "Timetable incomplete for Thursday" }],
      rotation: [
        { date: "2026-11-12", letter: "A", weekday: "Thursday" },
        { date: "2026-11-13", letter: "B", weekday: "Friday" },
        { date: "2026-11-11", letter: "D", weekday: "Wednesday" },
      ],
      blocks: [
        { teacher: "Cheyn", letter: "A", block: "1", start: "8:00 AM", end: "10:00 AM", freeMinutes: 120 },
        { teacher: "Cheyn", letter: "A", block: "2", start: "10:00 AM", end: "11:00 AM", freeMinutes: 60 },
        { teacher: "Cheyn", letter: "B", block: "1", start: "8:00 AM", end: "10:30 AM", freeMinutes: 150 },
      ],
      assessments: [{ date: "2026-11-12", start: "8:00 AM", end: "9:30 AM", student: "Busy", grade: "Grade 2", tests: ["WIDA"], assessor: "Cheyn", location: "", status: "Upcoming", eventId: "", calendarLink: "" }],
    });
    expect(suggestion.warning).toMatch(/incomplete/i);
    expect(suggestion.slots.map((slot) => `${slot.date} ${slot.slotStart}`)).toEqual(["2026-11-13 8:00 AM"]);
    expect(suggestion.message).toBe("Fewer than 5 open slots (1).");
    expect(suggestion.title).toBe("Assessment (WIDA) [Cheyn] - Ada Example (Grade 2), Y2026/27");
    expect(widaCalendarTitle("WIDA", "Cheyn", "Ada Example", "Grade 2")).toBe(suggestion.title);
    expect(suggestion.slots[0].blockEnd).toBe("10:30 AM");
  });

  it("reads new-student years and greys canceled rows in the summary", () => {
    const header = ["Student ID", "Name", "Nickname", "Grade", "Start date", "Start note", "Class", "Letter sent", "Payment status", "Scholarship type", "ELD/LS flag", "Status", "Notes", "Source year tab"];
    const bundle = readScheduleBundle({
      "New Students": [header, ["26010", "Ada Example", "Addy", "Gr 2", "2026-08-10", "", "2A", "Signed", "Paid", "", "", "Active", "", ""]],
      "New Students 2024-2025": [header, ["", "Bea Example", "", "Gr 3", "", "", "", "Sent", "Pending", "", "ELD", "Canceled", "", ""]],
    });
    expect(bundle.newStudents["2026-2027"]?.[0].studentId).toBe("26010");
    expect(bundle.newStudents["2023-2024"]).toBeNull();
    expect(missingNewStudentsMessage("2023-2024")).toBe("No new students found for 2023-2024 yet");
    const summary = newStudentSummary(bundle.newStudents["2024-2025"] ?? []);
    expect(summary.active).toBe(0);
    expect(newStudentIsInactive(bundle.newStudents["2024-2025"]![0])).toBe(true);
    expect(newStudentSummary(bundle.newStudents["2026-2027"] ?? [])).toMatchObject({ active: 1, lettersSigned: 1, classAssigned: 1, idAssigned: 1 });
    const years = readNewStudentYears({});
    expect(years["2027-2028"]).toBeNull();
  });
});
