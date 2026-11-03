import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }),
}));

import { fetchNotionParts, fetchOaStudentParts, fetchSheetParts } from "@/lib/server/adapters/fetch-office";
import { parseNotionPages, parseOaStudents, parseSheetTable } from "@/lib/server/adapters/parse";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("mocked source adapters", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses an OpenApply student page without writing", async () => {
    const calls: { url: string; method: string }[] = [];
    const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
      calls.push({ url: String(url), method: init?.method ?? "GET" });
      const page = String(url).includes("page=2") ? [] : [{ id: 4242, first_name: "Ada", last_name: "Example", student_id: "90042", status: "pending", enrollment_year: 2026, birth_date: "2015-01-01", tags: ["Open House"], custom_fields: [{ key: "nationality", value: "Fictional" }] }];
      return jsonResponse({ students: page });
    }) as typeof fetch;
    const parts = await fetchOaStudentParts(fetchImpl, "test-token");
    expect(parts.map((part) => part.firstName)).toEqual(["Ada"]);
    expect(parts[0].studentId).toBeUndefined();
    expect(parts[0].fields.nationality).toBe("Fictional");
    expect(calls.every((call) => call.method === "GET" && call.url.includes("/students?"))).toBe(true);
    expect(parseOaStudents({ students: [] })).toEqual([]);
  });

  it("queries Notion and does not patch pages", async () => {
    const calls: { url: string; method: string }[] = [];
    const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
      calls.push({ url: String(url), method: init?.method ?? "GET" });
      return jsonResponse({
        results: [
          {
            properties: {
              "Student Name": { type: "title", title: [{ plain_text: "Ada Example" }] },
              "OA Profile": { type: "url", url: "https://example.com/admin/students/4242" },
              Status: { type: "status", status: { name: "Application Submitted" } },
            },
          },
        ],
        has_more: false,
      });
    }) as typeof fetch;
    const parts = await fetchNotionParts("source-id", "notion-pipeline", fetchImpl, "notion-test-token");
    expect(parts[0].oaId).toBe("4242");
    expect(parts[0].fields.notionStatus).toBe("Application Submitted");
    expect(calls).toEqual([{ url: "https://api.notion.com/v1/data_sources/source-id/query", method: "POST" }]);
    expect(calls.some((call) => call.url.includes("/pages") || call.method === "PATCH")).toBe(false);
    expect(parseNotionPages([], "notion-pipeline")).toEqual([]);
  });

  it("reads a source sheet with GET values only", async () => {
    const calls: { url: string; method: string }[] = [];
    const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
      calls.push({ url: String(url), method: init?.method ?? "GET" });
      return jsonResponse({
        values: [
          ["Title"],
          ["No.", "First Name", "Surname", "ID No."],
          ["1", "Ada", "Example", "90042"],
        ],
      });
    }) as typeof fetch;
    const parts = await fetchSheetParts("sheet-id", "A1:D5", "weena", ["No.", "First Name"], fetchImpl, "test-token");
    expect(parts[0]).toMatchObject({ firstName: "Ada", lastName: "Example", studentId: "90042", fields: { weenaNo: "1", onWeena: "yes" } });
    expect(calls[0].method).toBe("GET");
    expect(calls[0].url).toContain("/values/");
    expect(calls.some((call) => call.method === "PUT" || call.method === "PATCH")).toBe(false);
    expect(parseSheetTable([["No header"]], "weena", ["No.", "First Name"])).toEqual([]);
  });
});
