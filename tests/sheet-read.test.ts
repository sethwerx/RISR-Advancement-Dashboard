import { describe, expect, it } from "vitest";
import { standaloneSheetTitles } from "@/lib/office/sheet-schema";
import { SHEET_READ_BATCH, chunkList, interpretSheetResponse, masterSheetReadTitles, sheetA1Range } from "@/lib/standalone/sheet-read";

describe("master sheet reads", () => {
  it("keeps the live tab names and the A1:AZ5000 range", () => {
    const titles = masterSheetReadTitles();
    expect(new Set(titles).size).toBe(titles.length);
    for (const title of standaloneSheetTitles) expect(titles).toContain(title);
    expect(titles).toContain("Tours/Visits");
    expect(titles).toContain("Student List");
    expect(titles).toContain("Student List 2025-2026");
    expect(titles).toContain("Withdrawals 2019-2020");
    expect(titles).toContain("Alumni 2027");
    expect(titles).not.toContain("Student list");
    expect(sheetA1Range("Tours/Visits")).toBe("'Tours/Visits'!A1:AZ5000");
    expect(sheetA1Range("O'Brien")).toBe("'O''Brien'!A1:AZ5000");
    expect(chunkList(titles, SHEET_READ_BATCH).flat()).toEqual(titles);
    expect(SHEET_READ_BATCH).toBeLessThanOrEqual(12);
  });

  it("treats a missing optional tab as empty and stops on a real failure", () => {
    expect(interpretSheetResponse("Applicants", 200, [["Name"], ["Ada"]])).toEqual({ values: [["Name"], ["Ada"]], error: "" });
    expect(interpretSheetResponse("Alumni 2027", 400, null, "Unable to parse range")).toEqual({ values: [], error: "" });
    expect(interpretSheetResponse("ELD Teachers", 404, null).error).toBe("");
    expect(interpretSheetResponse("Student List", 403, null, "forbidden").error).toMatch(/Student List/);
    expect(() => interpretSheetResponse("Applicants", 403, null, "forbidden")).toThrow(/Applicants/);
  });
});
