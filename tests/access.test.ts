import { describe, expect, it } from "vitest";
import vercel from "../vercel.json";
import { accessGateEnabled, isSchoolEmail } from "@/lib/access";
import { decodeSnapshot, encodeSnapshot } from "@/lib/office/snapshot-json";
import { bangkokParts } from "@/lib/office/schedule";
import { fictionalSnapshot } from "@/lib/office/sample";
import { readSessionEmail, signSession } from "@/lib/session-cookie";

describe("school sign-in", () => {
  it("accepts only a risr.ac.th mailbox", () => {
    expect(isSchoolEmail("Seth.J@RISR.ac.th")).toBe(true);
    expect(isSchoolEmail("person@gmail.com")).toBe(false);
    expect(isSchoolEmail("person@risr.ac.th.evil.com")).toBe(false);
    expect(isSchoolEmail("@risr.ac.th")).toBe(false);
  });

  it("turns the gate on for Vercel and production, and off for local dev", () => {
    expect(accessGateEnabled({ VERCEL: "1" })).toBe(true);
    expect(accessGateEnabled({ NODE_ENV: "production" })).toBe(true);
    expect(accessGateEnabled({ NODE_ENV: "development" })).toBe(false);
    expect(accessGateEnabled({ NODE_ENV: "production", AUTH_REQUIRED: "false" })).toBe(false);
    expect(accessGateEnabled({ NODE_ENV: "development", AUTH_REQUIRED: "true" })).toBe(true);
  });

  it("round-trips a signed school session and rejects another domain", async () => {
    const secret = "test-session-secret";
    const signed = await signSession("sethj@risr.ac.th", secret);
    expect(await readSessionEmail(signed, secret)).toBe("sethj@risr.ac.th");
    expect(await readSessionEmail(signed, "other-secret")).toBeNull();
    const outsider = await signSession("person@gmail.com", secret);
    expect(await readSessionEmail(outsider, secret)).toBeNull();
  });
});

describe("weekday cron", () => {
  it("schedules 22:55 UTC Sunday through Thursday, which is 05:55 ICT Monday through Friday", () => {
    expect(vercel.crons).toEqual([{ path: "/api/cron/sync", schedule: "55 22 * * 0-4" }]);
    const mondayMorning = bangkokParts(new Date("2026-11-01T22:55:00.000Z"));
    expect(mondayMorning).toMatchObject({ date: "2026-11-02", weekday: "Mon", hour: 5, minute: 55 });
    const saturdayMorning = bangkokParts(new Date("2026-11-06T22:55:00.000Z"));
    expect(saturdayMorning.weekday).toBe("Sat");
  });
});

describe("hosted snapshot", () => {
  it("encodes the snapshot into sheet rows and reads it back", () => {
    const snapshot = fictionalSnapshot();
    expect(decodeSnapshot(encodeSnapshot(snapshot))?.generatedAt).toBe(snapshot.generatedAt);
  });
});
