import { describe, expect, it } from "vitest";
import { sourceSheets } from "@/config/sources";
import { categorizeWithdrawalReason } from "@/config/withdrawal-reasons";
import { admittedStage, applicantStage, buildOfficeTabs, declineCategory, deriveOffer, scholarshipCategory } from "@/lib/office/build";
import { extractOaId, joinPeople, normalizeStudentId } from "@/lib/office/join";
import { shouldRunScheduledSync } from "@/lib/office/schedule";
import { fictionalParts, fictionalSnapshot } from "@/lib/office/sample";
import type { JoinedPerson, SourcePart } from "@/lib/office/types";
import { rowInYear } from "@/lib/office/year";

function person(overrides: Partial<JoinedPerson> & Pick<JoinedPerson, "firstName" | "lastName">): JoinedPerson {
  return {
    id: "t",
    grade: "G1",
    fields: {},
    sources: ["oa"],
    match: "single",
    confidence: "high",
    ...overrides,
  };
}

describe("office join", () => {
  it("joins on OA id, then student id, then name and date of birth", () => {
    const parts: SourcePart[] = [
      { source: "oa", oaId: "55", studentId: "90021", firstName: "Ada", lastName: "Lovelace", dob: "2014-01-02", fields: { oaStatus: "pending" } },
      { source: "notion-pipeline", oaId: "https://example.com/admin/students/55", firstName: "Ada", lastName: "Lovelace", fields: { notionStatus: "Inquiry" } },
      { source: "weena", studentId: "90021", firstName: "A.", lastName: "Lovelace", fields: { weenaNo: "1" } },
      { source: "alumni", firstName: "Grace", lastName: "Hopper", dob: "2010-05-05", fields: { gradYear: "2026" } },
      { source: "oa", firstName: "Grace", lastName: "Hopper", dob: "2010-05-05", fields: { oaStatus: "graduated" } },
    ];
    const joined = joinPeople(parts);
    const ada = joined.find((item) => item.firstName === "Ada");
    const grace = joined.find((item) => item.firstName === "Grace");
    expect(ada?.sources.sort()).toEqual(["notion-pipeline", "oa", "weena"]);
    expect(ada?.confidence).toBe("high");
    expect(ada?.studentId).toBe("90021");
    expect(grace?.match).toBe("name-dob");
    expect(grace?.confidence).toBe("high");
  });

  it("marks a name-only match as low confidence", () => {
    const joined = joinPeople([
      { source: "oa", oaId: "9", firstName: "Mina", lastName: "Chen", fields: { oaStatus: "graduated" } },
      { source: "alumni", firstName: "Mina", lastName: "Chen", fields: { gradYear: "2026" } },
    ]);
    expect(joined).toHaveLength(1);
    expect(joined[0].confidence).toBe("low");
    expect(joined[0].match).toBe("name-only");
  });

  it("reads an OA id from a profile URL and keeps 5-digit student ids", () => {
    expect(extractOaId("https://risr.openapply.com/admin/students/81001")).toBe("81001");
    expect(normalizeStudentId("90-001")).toBe("90001");
    expect(normalizeStudentId("12")).toBeUndefined();
  });
});

describe("office tabs", () => {
  const snapshot = fictionalSnapshot();

  it("keeps pending applicants back to 2021 under the default year", () => {
    const pending = snapshot.tabs.applicants.rows.filter((row) => row.oaStatus === "pending");
    expect(pending.some((row) => row.enrollmentYear === 2022)).toBe(true);
    expect(rowInYear({ enrollmentYear: 2022, oaStatus: "pending" }, "2026-27", "applicants")).toBe(true);
    expect(rowInYear({ enrollmentYear: 2020, oaStatus: "pending" }, "2026-27", "applicants")).toBe(false);
    expect(rowInYear({ enrollmentYear: 2025, oaStatus: "applied" }, "2026-27", "applicants")).toBe(false);
  });

  it("maps stages, offers, declines, and scholarship categories", () => {
    expect(applicantStage(person({ firstName: "A", lastName: "B", fields: { oaStatus: "applied" } }))).toBe("Applicant");
    expect(applicantStage(person({ firstName: "A", lastName: "B", fields: { oaStatus: "pending" } }))).toBe("Prospect/inquiry");
    expect(admittedStage(person({ firstName: "A", lastName: "B", fields: { oaStatus: "admitted" } }))).toBe("Admitted, not yet enrolled");
    expect(declineCategory(person({ firstName: "A", lastName: "B", fields: { oaStatus: "declined", statusLevel: "Needs Not Compatible - LS" } }))).toBe("School declined (needs not met)");
    expect(deriveOffer(person({ firstName: "A", lastName: "B", fields: { admittedDate: "2026-02-01", tags: "Conditional - Academic" } }))).toBe("Conditional");
    expect(deriveOffer(person({ firstName: "A", lastName: "B", fields: { oaStatus: "enrolled", statusLevel: "Seat Reserved Paid (50K)" } }))).toBe("Offer accepted");
    expect(scholarshipCategory("Diversity -30%")).toBe("Scholarship");
    expect(scholarshipCategory("Sibling")).toBe("Regular discount");
    expect(scholarshipCategory("Registration Fee Waived")).toBe("Admissions incentive");
  });

  it("counts a student as active only with a No. and keeps LOA listed", () => {
    const list = snapshot.tabs["student-list"];
    const loa = list.rows.find((row) => row.cells.Name === "Isla Rahman");
    expect(loa?.badges).toContain("LOA");
    expect(loa?.cells["No."]).toBe("8");
    expect(list.reconciliation?.map((item) => item.label)).toEqual(["Weena (has No.)", "OA enrolled", "Notion Active"]);
    expect(list.mismatches?.some((item) => item.name === "Chloe Nguyen")).toBe(true);
    expect(snapshot.tabs.withdrawals.rows.some((row) => row.cells.Name === "Isla Rahman")).toBe(false);
  });

  it("categorizes withdrawal reasons from the editable map", () => {
    expect(categorizeWithdrawalReason("Moving to another school in Bangkok")).toBe("Other School");
    expect(categorizeWithdrawalReason("Leaving Thailand")).toBe("Leaving Thailand");
    expect(categorizeWithdrawalReason("Personal")).toBe("Other");
    const categories = snapshot.tabs.withdrawals.rows.map((row) => row.cells.Category);
    expect(categories).toContain("Other");
    expect(categories).toContain("Leaving Thailand");
  });

  it("shows the finance list date and the known data gaps", () => {
    expect(snapshot.tabs.scholarships.note).toContain("6 March 2026");
    expect(snapshot.tabs["canceled-declined"].gaps.some((gap) => gap.label === "Missing reasons")).toBe(true);
    expect(snapshot.tabs.applicants.gaps.some((gap) => gap.label === "Missing Enrollment Year")).toBe(true);
    expect(snapshot.tabs.offers.rows.some((row) => row.cells.Outcome === "Conditional")).toBe(true);
  });

  it("does not use source spreadsheet ids as sample people", () => {
    const blob = JSON.stringify(fictionalParts());
    for (const id of Object.values(sourceSheets)) expect(blob).not.toContain(id);
  });
});

describe("weekday sync clock", () => {
  it("runs at 05:55 Asia/Bangkok on a weekday and skips the weekend", () => {
    expect(shouldRunScheduledSync(new Date("2026-11-02T22:55:00.000Z"), null)).toBe(true);
    expect(shouldRunScheduledSync(new Date("2026-11-02T22:55:00.000Z"), "2026-11-03")).toBe(false);
    expect(shouldRunScheduledSync(new Date("2026-11-07T22:55:00.000Z"), null)).toBe(false);
  });
});

describe("tab builders stay populated", () => {
  it("builds every office tab from the fictional snapshot", () => {
    const tabs = buildOfficeTabs(joinPeople(fictionalParts()));
    expect(Object.keys(tabs)).toEqual([
      "applicants",
      "assessments",
      "admitted",
      "canceled-declined",
      "offers",
      "student-list",
      "withdrawals",
      "alumni",
      "scholarships",
    ]);
    for (const tab of Object.values(tabs)) expect(tab.rows.length).toBeGreaterThan(0);
  });
});
