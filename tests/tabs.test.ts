import { describe, expect, it } from "vitest";
import { admittedColumns, admittedRows } from "@/tabs/admitted/sample";
import { alumniColumns, alumniRows } from "@/tabs/alumni/sample";
import { admissionPipelineStages, applicantColumns, applicantRows } from "@/tabs/applicants/sample";
import { canceledDeclinedColumns, canceledDeclinedRows } from "@/tabs/canceled-declined/sample";
import { scholarshipColumns, scholarshipRows } from "@/tabs/scholarships/sample";
import { activeStudentCount, studentListColumns, studentListRows } from "@/tabs/student-list/sample";
import { tabs } from "@/tabs/registry";
import { withdrawalColumns, withdrawalRows } from "@/tabs/withdrawals/sample";

describe("scaffold tabs", () => {
  it("lists the School Admission Pipeline stages in order", () => {
    expect([...admissionPipelineStages]).toEqual([
      "Inquiry",
      "Open House/Tour",
      "Family is Interested",
      "Application",
      "Assessment",
      "File Review",
      "Offer",
      "Seat Reserved",
      "Admitted/Enrolled",
    ]);
    expect(applicantColumns).toEqual(["Applicant", "Grade", "Stage"]);
    expect(applicantRows.map((row) => row[2])).toEqual([...admissionPipelineStages]);
  });

  it("counts only students with a No. and keeps LOA rows on the list", () => {
    expect(studentListColumns).toEqual(["No.", "Student", "Grade", "Status"]);
    expect(activeStudentCount(studentListRows)).toBe(3);
    expect(studentListRows.filter((row) => row[3] === "LOA")).toHaveLength(2);
    expect(studentListRows.filter((row) => row[3] === "LOA").every((row) => row[0] === "")).toBe(true);
  });

  it("uses the scholarship placeholder columns", () => {
    expect([...scholarshipColumns]).toEqual(["Applicant", "Grade", "Scholarship type", "Amount/percent", "Status"]);
    expect(scholarshipRows).toHaveLength(4);
    expect(scholarshipRows.every((row) => row.length === scholarshipColumns.length)).toBe(true);
  });

  it("orders the tab bar and keeps slash labels tight", () => {
    expect(tabs.map((tab) => tab.label)).toEqual([
      "Tours/Visits",
      "Applicants",
      "Admitted",
      "Canceled/Declined",
      "Student List",
      "Withdrawals",
      "Alumni",
      "Scholarships",
      "Retention",
      "Analytics",
    ]);
    expect(tabs.filter((tab) => !tab.enabled).map((tab) => tab.label)).toEqual(["Retention", "Analytics"]);
    expect(tabs.some((tab) => tab.label === "Applications")).toBe(false);
    expect(admittedRows.every((row) => row.length === admittedColumns.length)).toBe(true);
    expect(canceledDeclinedRows.every((row) => row.length === canceledDeclinedColumns.length)).toBe(true);
    expect(withdrawalRows.every((row) => row.length === withdrawalColumns.length)).toBe(true);
    expect(alumniRows.every((row) => row.length === alumniColumns.length)).toBe(true);
    expect(tabs.map((tab) => tab.label).join(" ")).not.toMatch(/ \/ /);
  });
});
