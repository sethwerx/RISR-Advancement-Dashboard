import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildEventBody, buildNoShowPatch, calendarWriteQuery, sendUpdatesFor } from "@/lib/calendar-payload";
import { buildSeedBundle } from "@/lib/mock/seed";
import { matchRegistrations, planSync } from "@/lib/match";
import { LOG_HEADERS, PRINT_HEADERS, TOUR_HEADERS } from "@/lib/sheet/schema";
import { logSheetRows, printSheetRows, tourSheetRows } from "@/lib/sheet/rows";
import { buildTourViews } from "@/lib/merge";
import { dashboardConfig } from "@/config/dashboard.config";

describe("calendar payloads", () => {
  it("sends the normal invite on create and none on later edits", () => {
    expect(sendUpdatesFor("create")).toBe("all");
    expect(sendUpdatesFor("update")).toBe("none");
    expect(calendarWriteQuery("create", true)).toContain("sendUpdates=all");
    expect(calendarWriteQuery("update", false)).toBe("sendUpdates=none");
  });

  it("never includes Google Meet fields", () => {
    const body = buildEventBody({
      title: "Tour (OA) - Anan Siri (G3)",
      description: "OA Registration ID: 1",
      startIso: "2025-03-04T10:00:00+07:00",
      endIso: "2025-03-04T12:00:00+07:00",
      guests: ["sethj@risr.ac.th", "passarananv@risr.ac.th"],
      registrationId: 1,
      notes: { fileId: "doc", fileUrl: "https://docs.google.com/document/d/doc/edit" },
    });
    expect(body).not.toHaveProperty("conferenceData");
    expect(body).not.toHaveProperty("conferenceDataVersion");
    expect(buildNoShowPatch("Tour (OA) [No Show] - Anan Siri (G3)")).toEqual({
      summary: "Tour (OA) [No Show] - Anan Siri (G3)",
    });
    expect(() => buildEventBody({
      title: "x",
      description: "y",
      startIso: "2025-03-04T10:00:00+07:00",
      endIso: "2025-03-04T12:00:00+07:00",
      guests: [],
      registrationId: 1,
    })).not.toThrow();
  });
});

describe("OpenApply client", () => {
  it("only posts to the token endpoint", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/server/openapply.ts"), "utf8");
    const posts = src.match(/method:\s*["']POST["']/g) ?? [];
    expect(posts).toHaveLength(1);
    expect(src).toContain('grant_type: "client_credentials"');
    expect(src).not.toMatch(/method:\s*["'](?:PUT|PATCH|DELETE)["']/);
  });
});

describe("seed stories", () => {
  it("classifies the sample tours the office needs to see", () => {
    const seed = buildSeedBundle();
    const duration = dashboardConfig.tours.durationMinutes;
    const matches = matchRegistrations(seed.registrations, seed.events, duration);
    const byId = new Map(matches.map((match) => [match.registration.id, match]));
    expect(byId.get(88001)?.status).toBe("missing");
    expect(byId.get(88002)?.status).toBe("rescheduled");
    expect(byId.get(88003)?.status).toBe("synced");
    expect(byId.get(88006)?.status).toBe("canceled");
    expect(byId.get(88006)?.event).not.toBeNull();
    expect(byId.get(88022)?.status).toBe("synced");
    expect(byId.get(88022)?.event?.registrationId).toBeNull();
    expect(byId.get(88025)?.event).toBeNull();
    const plan = planSync(matches);
    expect(plan.toCreate.map((item) => item.registration.id).sort()).toEqual([88001, 88009, 88026, 88030]);
    expect(plan.toCreate.every((item) => item.registration.state === "scheduled")).toBe(true);
    const views = buildTourViews(seed.registrations, seed.events, seed.notes, seed.log, seed.docs, duration);
    const noShow = views.find((tour) => tour.registrationId === 88016);
    expect(noShow?.noShow).toBe(true);
    expect(noShow?.pendingOaReminder).toBe(true);
    expect(views.find((tour) => tour.registrationId === 88023)?.pendingOaReminder).toBe(false);
    const tours = tourSheetRows(views);
    const printed = printSheetRows(views);
    const logged = logSheetRows(seed.log);
    expect(tours[0]).toEqual([...TOUR_HEADERS]);
    expect(tours[1]).toHaveLength(TOUR_HEADERS.length);
    expect(printed[1]).toHaveLength(PRINT_HEADERS.length);
    expect(logged[1]).toHaveLength(LOG_HEADERS.length);
  });
});
