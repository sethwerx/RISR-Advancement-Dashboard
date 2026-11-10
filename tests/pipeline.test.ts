import { describe, expect, it } from "vitest";
import type { OfficeRow } from "@/lib/office/types";
import { admittedKpis, enrollmentYearKey, filterByEnrollmentYear, missingItemChips, paymentLabel, sortApplicants, startDatePassed } from "@/lib/standalone/pipeline";

function row(cells: Record<string, string>): OfficeRow {
  return { id: cells.Name || cells["OA id"] || "row", cells, detail: [], badges: [] };
}

describe("admitted and applicant pipeline", () => {
  it("maps enrollment years and admitted KPIs", () => {
    expect(enrollmentYearKey("2026")).toBe("2026-27");
    expect(enrollmentYearKey("2027/28")).toBe("2027-28");
    expect(enrollmentYearKey("2028-2029")).toBe("2028-29");
    const rows = [
      row({ Name: "Future", "Enrollment year": "2026", "Start date": "2026-11-20", "Payment status": "", Invoice: "Invoiced", Status: "Admitted" }),
      row({ Name: "Late", "Enrollment year": "2026-27", "Start date": "2026-08-10", "Payment status": "Paid", Invoice: "Paid", Status: "Admitted" }),
      row({ Name: "Next year", "Enrollment year": "2027-28", "Start date": "2027-08-01", "Payment status": "", Status: "Admitted" }),
    ];
    expect(filterByEnrollmentYear(rows, "2026-27").map((item) => item.cells.Name)).toEqual(["Future", "Late"]);
    expect(admittedKpis(filterByEnrollmentYear(rows, "2026-27"), "2026-11-09")).toEqual({ total: 2, starting: 1, passed: 1, awaitingFinance: 1 });
    expect(startDatePassed(rows[1], "2026-11-09")).toBe(true);
    expect(paymentLabel(rows[0])).toBe("Awaiting Finance");
    expect(paymentLabel(rows[1])).toBe("Paid");
  });

  it("sorts applicants by bucket, then latest update", () => {
    const rows = [
      row({ Name: "Old review", Bucket: "Reviewing", "Last updated": "2026-11-01", "Missing items": "Passport, Report", "Reviewed by": "" }),
      row({ Name: "New review", Bucket: "reviewing files", "Last updated": "2026-11-08", "Assessment date": "2026-11-12" }),
      row({ Name: "Incomplete", Bucket: "Incomplete", "Last updated": "2026-11-09", "Enrollment year": "2026" }),
      row({ Name: "Other year", Bucket: "Incomplete", "Enrollment year": "2028" }),
    ];
    expect(sortApplicants(rows).map((item) => item.cells.Name)).toEqual(["Incomplete", "Other year", "New review", "Old review"]);
    expect(filterByEnrollmentYear(rows, "2028-29").map((item) => item.cells.Name)).toEqual(["Other year"]);
    expect(missingItemChips("Passport, Report")).toEqual(["Passport", "Report"]);
    expect(rows[0].cells["Reviewed by"]?.trim() || "—").toBe("—");
  });
});
