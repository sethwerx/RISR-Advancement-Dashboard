import { describe, expect, it } from "vitest";
import { fictionalSnapshot } from "@/lib/office/sample";
import { masterSheetColumns } from "@/lib/office/sheet-schema";
import { calendarWriteQuery, noShowPatch, payloadFromTable, snapshotFromSheets, tourRowsFromSheets, toursFromSheet, walkInEventBody } from "@/lib/standalone/data";
import { latestSyncAt, normalizeWebhookUrl, syncLogAdvanced } from "@/lib/standalone/sync-webhook";

describe("master sheet contract", () => {
  it("matches the columns the dashboard writes", () => {
    const snapshot = fictionalSnapshot();
    expect(snapshot.tabs.applicants.columns).toEqual([...masterSheetColumns.Applicants]);
    expect(snapshot.tabs.assessments.columns).toEqual([...masterSheetColumns.Assessments]);
    expect(snapshot.tabs.admitted.columns).toEqual([...masterSheetColumns.Admitted]);
    expect(snapshot.tabs["canceled-declined"].columns).toEqual([...masterSheetColumns["Canceled/Declined"]]);
    expect(snapshot.tabs.offers.columns).toEqual([...masterSheetColumns.Offers]);
    expect(snapshot.tabs["student-list"].columns).toEqual([...masterSheetColumns["Student List"]]);
    expect(snapshot.tabs.withdrawals.columns).toEqual([...masterSheetColumns.Withdrawals]);
    expect(snapshot.tabs.alumni.columns).toEqual([...masterSheetColumns.Alumni]);
    expect(snapshot.tabs.scholarships.columns).toEqual([...masterSheetColumns.Scholarships]);
  });

  it("rebuilds a tab from header and rows", () => {
    const payload = payloadFromTable("student-list", "Student List", [
      [...masterSheetColumns["Student List"]],
      ["4", "90010", "", "Ben Rahman", "G2", "2A", "", "", "2018-11-11", "2026-08-10", "Active", "", ""],
    ]);
    expect(payload?.rows[0].cells["Student ID"]).toBe("90010");
    expect(payload?.mismatches?.[0].issue).toBe("Active in Weena's sheet but no OA record");
  });

  it("reads tours and prefers a Snapshot tab", () => {
    const tours = toursFromSheet([
      ["Registration ID", "Students", "Date", "Time", "Grades", "Host", "Attendance", "Calendar event ID"],
      ["42", "Ada Example", "2026-11-01", "10:00 AM", "G3", "Riley Quinn", "", "evt-1"],
    ]);
    expect(tours[0]).toMatchObject({ id: "42", students: "Ada Example", calendarEventId: "evt-1" });
    const preferred = tourRowsFromSheets({
      Tours: [["Students"], ["Old tab"]],
      "Tours/Visits": [
        ["Registration ID", "Students"],
        ["7", "Preferred tab"],
      ],
    });
    expect(preferred[0].students).toBe("Preferred tab");
    expect(tourRowsFromSheets({ Tours: [["Students"], ["Only tours"]] })[0].students).toBe("Only tours");
    const rich = fictionalSnapshot("2026-11-03T00:00:00.000Z");
    const loaded = snapshotFromSheets({
      Snapshot: [["snapshot-v1"], [JSON.stringify(rich)]],
      Applicants: [["Name"], ["Ignored"]],
    });
    expect(loaded?.generatedAt).toBe(rich.generatedAt);
  });
});

describe("sync webhook", () => {
  it("accepts only an https URL and notices a newer Sync Log time", () => {
    expect(normalizeWebhookUrl("  https://example.com/hook  ")).toBe("https://example.com/hook");
    expect(normalizeWebhookUrl("http://example.com/hook")).toBeNull();
    expect(normalizeWebhookUrl("not a url")).toBeNull();
    expect(syncLogAdvanced("2026-11-06T05:55:00.000Z", "2026-11-06T06:10:00.000Z")).toBe(true);
    expect(syncLogAdvanced("2026-11-06T05:55:00.000Z", "2026-11-06T05:55:00.000Z")).toBe(false);
    expect(latestSyncAt([{ at: "2026-11-06T05:55:00.000Z" }, { at: "2026-11-06T06:10:00.000Z" }])).toBe("2026-11-06T06:10:00.000Z");
  });
});

describe("local calendar writes", () => {
  it("never adds Meet and always uses sendUpdates=none", () => {
    const body = walkInEventBody({
      summary: "Walk-in - Ada Example (G3)",
      description: "Source: Walk-in",
      start: "2026-11-12T01:00:00.000Z",
      end: "2026-11-12T03:00:00.000Z",
    });
    expect(body).not.toHaveProperty("conferenceData");
    expect(JSON.stringify(body)).not.toMatch(/hangout|conference/i);
    expect(calendarWriteQuery()).toBe("sendUpdates=none");
    expect(noShowPatch("Tour (OA) - Ada Example (G3)").summary).toContain("[No Show]");
  });
});
