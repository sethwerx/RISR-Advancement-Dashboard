import { describe, expect, it } from "vitest";
import { fictionalSnapshot } from "@/lib/office/sample";
import { defaultYearForTab, rowInYear } from "@/lib/office/year";
import { masterSheetColumns } from "@/lib/office/sheet-schema";
import { applyMasterLoad, calendarWriteQuery, demoOfficeSession, initialOfficeSession, isFictionalStudentRoster, noShowPatch, payloadFromTable, presentStudentList, readMasterSheets, signInStudentListMessage, snapshotFromSheets, studentListReadError, tourRowsFromSheets, toursFromSheet, walkInEventBody } from "@/lib/standalone/data";
import { canonicalGrade, filterStudentsByGrade, studentGradeLevels } from "@/lib/standalone/grades";
import { currentStudentListYear, gradeButtonsForRows, missingStudentListMessage, studentListSchoolYears, studentListTabIsRequired } from "@/lib/standalone/student-years";
import { missingYearMessage, optionalYearTabTitles, yearTabIsRequired, yearTabSections } from "@/lib/standalone/school-years";
import { dashboardTabs, syncControlLabel } from "@/lib/standalone/tabs";
import { describeSyncSchedule, latestSyncAt, normalizeWebhookUrl, parseSyncSchedule, syncLogAdvanced, syncWebhookBody } from "@/lib/standalone/sync-webhook";
import type { OfficeRow } from "@/lib/office/types";

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
    const ignoredSample = snapshotFromSheets({
      Snapshot: [["snapshot-v1"], [JSON.stringify(rich)]],
      Applicants: [["Name"], ["Ignored"]],
    });
    expect(ignoredSample?.tabs.applicants.rows[0].cells.Name).toBe("Ignored");
    expect(ignoredSample?.tabs["student-list"].rows).toEqual([]);
    const live = {
      ...rich,
      mock: false as const,
      syncLog: [{ at: rich.generatedAt, scope: "all tabs", rows: 1, mode: "live" as const, note: "Live snapshot written to the master sheet." }],
      tabs: { ...rich.tabs, "student-list": { ...rich.tabs["student-list"], rows: [] } },
    };
    const loaded = snapshotFromSheets({
      Snapshot: [["snapshot-v1"], [JSON.stringify(live)]],
      Applicants: [["Name"], ["Ignored"]],
    });
    expect(loaded?.generatedAt).toBe(rich.generatedAt);
    expect(loaded?.tabs["student-list"].rows).toEqual([]);
    const sampleLog = snapshotFromSheets({
      Snapshot: [["snapshot-v1"], [JSON.stringify({ ...live, syncLog: [{ ...live.syncLog[0], mode: "sample" }] })]],
      Applicants: [["Name"], ["From sheet"]],
    });
    expect(sampleLog?.tabs.applicants.rows[0].cells.Name).toBe("From sheet");
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
    const schedule = parseSyncSchedule(JSON.stringify({ date: "2026-11-10", time: "05:55", interval: "weekdays", everyHours: 4 }));
    expect(syncWebhookBody(schedule)).toEqual({
      mode: "schedule",
      date: "2026-11-10",
      time: "05:55",
      interval: "weekdays",
      everyHours: 0,
      timezone: "Asia/Bangkok",
    });
    expect(syncWebhookBody({ ...schedule, interval: "hourly", everyHours: 3 }).everyHours).toBe(3);
    expect(syncWebhookBody({ ...schedule, interval: "manual" }).mode).toBe("manual");
    expect(describeSyncSchedule(schedule)).toBe("Weekdays at 05:55 Asia/Bangkok");
    expect(parseSyncSchedule("{").interval).toBe("weekdays");
  });
});

describe("student list grades", () => {
  const row = (grade: string): OfficeRow => ({ id: grade, cells: { Grade: grade, Name: grade }, detail: [], badges: [] });

  it("offers every Weena grade and filters the list", () => {
    expect([...studentGradeLevels]).toEqual([
      "Pre K 2",
      "Pre K 3",
      "Pre K 4",
      "KG",
      "Gr 1",
      "Gr 2",
      "Gr 3",
      "Gr 4",
      "Gr 5",
      "Gr 6",
      "Gr 7",
      "Gr 8",
      "Gr 9",
      "Gr 10",
      "Gr 11",
      "Gr 12",
    ]);
    expect(canonicalGrade("Pre K 2")).toBe("Pre K 2");
    expect(canonicalGrade("Pre-K 2")).toBe("Pre K 2");
    expect(canonicalGrade("Gr 1")).toBe("Gr 1");
    expect(canonicalGrade("Grade 1")).toBe("Gr 1");
    expect(canonicalGrade("G12")).toBe("Gr 12");
    expect(canonicalGrade("Kindergarten")).toBe("KG");
    const rows = [row("Gr 5"), row("Pre K 3"), row("G5")];
    expect(filterStudentsByGrade(rows, "all")).toHaveLength(3);
    expect(filterStudentsByGrade(rows, "Gr 5").map((item) => item.id)).toEqual(["Gr 5", "G5"]);
    expect(rowInYear({ enrollmentYear: undefined }, "2026-27", "student-list")).toBe(true);
  });

  it("keeps a missing enrollment year and maps a full Weena sheet", () => {
    expect(defaultYearForTab("student-list")).toBe("all");
    expect(rowInYear({ enrollmentYear: undefined }, "2026-27", "student-list")).toBe(true);
    const opened = initialOfficeSession();
    expect(opened.studentListOrigin).toBe("empty");
    expect(opened.tours).toEqual([]);
    expect(opened.snapshot.tabs["student-list"].rows).toEqual([]);
    expect(presentStudentList(fictionalSnapshot().tabs["student-list"], "empty").rows).toEqual([]);
    expect(presentStudentList(fictionalSnapshot().tabs["student-list"], "empty").note).toBe(signInStudentListMessage);

    const demo = demoOfficeSession();
    expect(demo.studentListOrigin).toBe("demo");
    expect(demo.snapshot.tabs["student-list"].rows.map((row) => row.cells.Name).sort()).toEqual(["Ben Rahman", "Chloe Nguyen", "Isla Rahman", "Yusuf Demir"]);
    const demoView = presentStudentList(demo.snapshot.tabs["student-list"], "demo");
    expect(demoView.kpis.map((item) => item.label)).toEqual(["Demo (4)"]);
    expect(demoView.rows.every((row) => row.badges.includes("Demo"))).toBe(true);
    expect(demoView.kpis.some((item) => item.label === "Active (has No.)")).toBe(false);

    const grades = ["Pre K 2", "Pre K 3", "Pre K 4", "KG", "Gr 1", "Gr 2", "Gr 3", "Gr 4", "Gr 5", "Gr 6", "Gr 7", "Gr 8", "Gr 9", "Gr 10", "Gr 11", "Gr 12"];
    const headers = [...masterSheetColumns["Student List"]];
    const body = Array.from({ length: 381 }, (_, index) => {
      const loa = index === 380;
      const grade = grades[index % grades.length];
      return [loa ? "" : String(index + 1), String(30000 + index), index < 60 ? "" : String(80000 + index), `Student ${index}`, grade, "", "", "", "", "10 Aug 2026", loa ? "LOA" : "Active", "", ""];
    });
    const loaded = readMasterSheets({
      Snapshot: [["snapshot-v1"], [JSON.stringify(fictionalSnapshot())]],
      "Student List": [headers, ...body],
      Tours: [["Students"], ["Ada Example"]],
    });
    expect(loaded.studentListFromSheet).toBe(true);
    const applied = applyMasterLoad(demo, loaded, "2026-11-06T03:00:00.000Z");
    const list = applied.session.snapshot.tabs["student-list"];
    expect(applied.error).toBe("");
    expect(applied.session.studentListOrigin).toBe("sheet");
    expect(applied.session.toursOrigin).toBe("sheet");
    expect(list.rows).toHaveLength(381);
    expect(list.rows.some((row) => row.cells.Name === "Yusuf Demir")).toBe(false);
    expect(list.rows.filter((row) => row.cells.Status === "Active")).toHaveLength(380);
    expect(list.rows.filter((row) => row.cells.Status === "LOA")).toHaveLength(1);
    expect(list.rows.filter((row) => !row.cells["OA id"])).toHaveLength(60);
    expect(list.rows.every((row) => row.enrollmentYear == null)).toBe(true);
    expect(list.rows.filter((row) => rowInYear(row, "all", "student-list"))).toHaveLength(381);
    expect(list.rows.filter((row) => rowInYear(row, "2026-27", "student-list"))).toHaveLength(381);
    expect(filterStudentsByGrade(list.rows, "all")).toHaveLength(381);
    expect(filterStudentsByGrade(list.rows, "Pre K 2").length).toBeGreaterThan(0);
    expect(filterStudentsByGrade(list.rows, "Gr 1").every((row) => canonicalGrade(row.cells.Grade) === "Gr 1")).toBe(true);
    expect(list.kpis.find((item) => item.label === "Active (has No.)")?.value).toBe("380");
    expect(list.columns.slice(0, 5)).toEqual(["No.", "Student ID", "OA id", "Name", "Grade"]);

    const toursOnly = readMasterSheets({
      Tours: [["Students"], ["Ada Example"]],
      Snapshot: [["snapshot-v1"], [JSON.stringify(fictionalSnapshot())]],
    });
    expect(toursOnly.studentListFromSheet).toBe(false);
    const partial = applyMasterLoad(demo, toursOnly, "2026-11-06T03:05:00.000Z");
    expect(partial.session.toursOrigin).toBe("sheet");
    expect(partial.session.studentListOrigin).toBe("empty");
    expect(partial.session.snapshot.tabs["student-list"].rows).toEqual([]);
    expect(partial.error).toMatch(/Student List did not load/);

    const failed = applyMasterLoad(applied.session, { snapshot: fictionalSnapshot(), tours: [], studentListFromSheet: false }, "2026-11-06T03:10:00.000Z");
    expect(failed.session.studentListOrigin).toBe("sheet");
    expect(failed.session.snapshot.tabs["student-list"].rows).toHaveLength(381);
    expect(failed.session.snapshot.tabs["student-list"].rows.some((row) => row.cells.Name === "Yusuf Demir")).toBe(false);
    expect(failed.error).toMatch(/Student List did not load/);

    expect(isFictionalStudentRoster(demo.snapshot.tabs["student-list"].rows)).toBe(true);
    const claimedSheet = applyMasterLoad(initialOfficeSession(), {
      snapshot: { ...demo.snapshot, mock: false },
      tours: demo.tours,
      studentListFromSheet: true,
    }, "2026-11-06T03:12:00.000Z");
    expect(claimedSheet.session.studentListOrigin).toBe("empty");
    expect(claimedSheet.session.toursOrigin).toBe("sheet");
    expect(claimedSheet.session.snapshot.tabs["student-list"].rows).toEqual([]);
    expect(presentStudentList(demo.snapshot.tabs["student-list"], "sheet").rows).toEqual([]);
    const httpFailed = applyMasterLoad(demo, {
      snapshot: null,
      tours: demo.tours,
      studentListFromSheet: false,
      studentListError: studentListReadError(400, "Unable to parse range: Student List"),
    }, "2026-11-06T03:15:00.000Z");
    expect(httpFailed.error).toContain("HTTP 400");
    expect(httpFailed.session.studentListOrigin).toBe("empty");
    expect(httpFailed.session.snapshot.tabs["student-list"].rows).toEqual([]);
    expect(httpFailed.session.snapshot.tabs["student-list"].rows.some((row) => row.cells.Name === "Yusuf Demir")).toBe(false);

    const aliased = payloadFromTable("student-list", "Student List", [
      ["No", "ID No.", "OA id", "Name", "Grade", "Start Date", "Status"],
      ["9", "55555", "", "Alias Child", "Gr 1", "10 Aug 2026", "Active"],
    ]);
    expect(aliased?.rows[0].cells["Student ID"]).toBe("55555");
    expect(aliased?.rows[0].cells["Start date"]).toBe("10 Aug 2026");
    expect(aliased?.rows[0].enrollmentYear).toBeUndefined();
    expect(filterStudentsByGrade(aliased?.rows ?? [], "Gr 1")).toHaveLength(1);
    expect(snapshotFromSheets({ Snapshot: [["snapshot-v1"], [JSON.stringify(fictionalSnapshot())]] })?.tabs["student-list"].rows ?? []).toEqual([]);
  });
});

describe("student list school years", () => {
  const headers = [...masterSheetColumns["Student List"]];
  const listRow = (name: string, grade: string, id: string, oa = "") => [name === "Loa Child" ? "" : "1", id, oa, name, grade, "", "", "", "", "1 Aug 2024", name === "Loa Child" ? "LOA" : "Active", "", ""];

  it("lists 2019-2020 through 2026-2027 newest first and switches years", () => {
    expect([...studentListSchoolYears]).toEqual([
      "2026-2027",
      "2025-2026",
      "2024-2025",
      "2023-2024",
      "2022-2023",
      "2021-2022",
      "2020-2021",
      "2019-2020",
    ]);
    expect(currentStudentListYear).toBe("2026-2027");
    expect(studentListTabIsRequired("Student List")).toBe(true);
    expect(studentListTabIsRequired("Student List 2019-2020")).toBe(false);
    expect(studentListTabIsRequired("Student List 2026-2027")).toBe(false);
    expect(missingStudentListMessage("2019-2020")).toBe("No student list found for 2019-2020 yet");

    const loaded = readMasterSheets({
      "Student List": [headers, listRow("Merged Current", "Gr 2", "30001", "91")],
      "Student List 2026-2027": [headers, listRow("Alias Copy", "Gr 9", "30002")],
      "Student List 2024-2025": [headers, listRow("Past Child", "Pre K 2", "24001"), listRow("Past Two", "G1", "24002")],
      "Student List 2019-2020": [headers],
      Applicants: [["Name"], ["Still here"]],
    });
    expect(loaded.studentListFromSheet).toBe(true);
    expect(loaded.snapshot?.tabs["student-list"].rows.map((row) => row.cells.Name)).toEqual(["Merged Current"]);
    expect(loaded.snapshot?.tabs["student-list"].mismatches).toEqual([]);
    const years = loaded.studentListsByYear;
    expect(years?.["2026-2027"]?.rows.map((row) => row.cells.Name)).toEqual(["Merged Current"]);
    expect(years?.["2024-2025"]?.rows.map((row) => row.cells.Name)).toEqual(["Past Child", "Past Two"]);
    expect(years?.["2024-2025"]?.mismatches).toBeUndefined();
    expect(years?.["2019-2020"]).toBeNull();
    expect(years?.["2020-2021"]).toBeNull();
    expect(loaded.snapshot?.tabs.applicants.rows[0].cells.Name).toBe("Still here");
    const past = years?.["2024-2025"]?.rows ?? [];
    expect(gradeButtonsForRows(past)).toEqual(["Pre K 2", "Gr 1"]);
    expect(filterStudentsByGrade(past, "Pre K 2").map((row) => row.cells.Name)).toEqual(["Past Child"]);
    expect(filterStudentsByGrade(past, "Gr 1").map((row) => row.cells.Name)).toEqual(["Past Two"]);
    expect(filterStudentsByGrade(past, "Gr 5")).toEqual([]);

    const aliasOnly = readMasterSheets({
      "Student List 2026-2027": [headers, listRow("Alias Current", "KG", "26001", "77")],
      "Student List 2025-2026": [headers, listRow("Last Year", "Gr 12", "25001")],
    });
    expect(aliasOnly.studentListFromSheet).toBe(true);
    expect(aliasOnly.snapshot?.tabs["student-list"].rows[0].cells.Name).toBe("Alias Current");
    expect(aliasOnly.studentListsByYear?.["2025-2026"]?.rows[0].cells.Name).toBe("Last Year");
    expect(aliasOnly.studentListsByYear?.["2019-2020"]).toBeNull();
    const applied = applyMasterLoad(initialOfficeSession(), aliasOnly, "2026-11-09T03:00:00.000Z");
    expect(applied.error).toBe("");
    expect(applied.session.studentListOrigin).toBe("sheet");
    expect(applied.session.studentListsByYear["2026-2027"]?.rows[0].cells.Name).toBe("Alias Current");
    expect(applied.session.studentListsByYear["2025-2026"]?.rows[0].cells.Name).toBe("Last Year");
    expect(applied.session.snapshot.tabs.applicants.rows).toEqual([]);
  });
});

describe("withdrawal school years", () => {
  const headers = [...masterSheetColumns.Withdrawals];
  const row = (name: string, category: string) => ["10001", "", name, "Gr 4", "2024-01-01", "2024-01-15", "", "Moving", category, "", ""];

  it("switches years and leaves a missing withdrawals tab empty", () => {
    expect(yearTabSections.map((section) => section.id)).toEqual(["student-list", "withdrawals"]);
    expect(missingYearMessage("withdrawals", "2019-2020")).toBe("No withdrawals found for 2019-2020 yet");
    expect(yearTabIsRequired("Withdrawals")).toBe(false);
    expect(yearTabIsRequired("Withdrawals 2019-2020")).toBe(false);
    expect(optionalYearTabTitles()).toEqual(expect.arrayContaining(["Withdrawals 2026-2027", "Withdrawals 2019-2020", "Student List 2025-2026"]));

    const loaded = readMasterSheets({
      "Student List": [[...masterSheetColumns["Student List"]], ["1", "9", "1", "Roster", "Gr 1", "", "", "", "", "", "Active", "", ""]],
      Withdrawals: [headers, row("Current Child", "Other School"), row("Second Child", "Not stated")],
      "Withdrawals 2026-2027": [headers, row("Alias Copy", "Other")],
      "Withdrawals 2024-2025": [headers, row("Past Child", "Leaving Thailand")],
      "Withdrawals 2019-2020": [headers],
    });
    expect(loaded.studentListFromSheet).toBe(true);
    expect(loaded.snapshot?.tabs.withdrawals.rows.map((item) => item.cells.Name)).toEqual(["Current Child", "Second Child"]);
    expect(loaded.yearArchives?.withdrawals["2026-2027"]?.rows).toHaveLength(2);
    expect(loaded.yearArchives?.withdrawals["2026-2027"]?.kpis.find((item) => item.id === "rows")?.value).toBe("2");
    const past = loaded.yearArchives?.withdrawals["2024-2025"];
    expect(past?.rows.map((item) => item.cells.Name)).toEqual(["Past Child"]);
    expect(past?.charts[0]?.points.find((point) => point.label === "Leaving Thailand")?.value).toBe(1);
    expect(loaded.yearArchives?.withdrawals["2019-2020"]).toBeNull();
    expect(loaded.yearArchives?.withdrawals["2020-2021"]).toBeNull();
    const applied = applyMasterLoad(initialOfficeSession(), loaded, "2026-11-09T04:00:00.000Z");
    expect(applied.error).toBe("");
    expect(applied.session.yearArchives.withdrawals["2024-2025"]?.rows[0].cells.Name).toBe("Past Child");
    expect(applied.session.yearArchives["student-list"]["2026-2027"]?.rows[0].cells.Name).toBe("Roster");

    const aliasOnly = readMasterSheets({
      "Withdrawals 2026-2027": [headers, row("Alias Current", "Relocation")],
    });
    expect(aliasOnly.snapshot?.tabs.withdrawals.rows[0].cells.Name).toBe("Alias Current");
    expect(aliasOnly.snapshot?.tabs.withdrawals.columns).toEqual(headers);
    expect(aliasOnly.yearArchives?.withdrawals["2019-2020"]).toBeNull();
  });
});

describe("per-tab sync", () => {
  it("gives every dashboard tab the shared Sync Now control", () => {
    expect(syncControlLabel).toBe("Sync Now");
    expect(dashboardTabs.map((tab) => tab.label)).toEqual([
      "Tours/Visits",
      "Applicants",
      "Assessments",
      "Admitted",
      "Canceled/Declined",
      "Offers",
      "Student List",
      "Withdrawals",
      "Alumni",
      "Scholarships",
      "Retention",
      "Analytics",
    ]);
    expect(new Set(dashboardTabs.map((tab) => tab.id)).size).toBe(dashboardTabs.length);
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
