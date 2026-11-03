import { describe, expect, it } from "vitest";
import { admissionPipelineStages, applicantColumns, applicantRows } from "@/tabs/applicants/sample";
import { scholarshipColumns, scholarshipRows } from "@/tabs/scholarships/sample";
import { activeStudentCount, studentListColumns, studentListRows } from "@/tabs/student-list/sample";

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
});
