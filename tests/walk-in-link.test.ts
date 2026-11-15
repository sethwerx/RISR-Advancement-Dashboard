import { describe, expect, it } from "vitest";
import {
  WALK_IN_BUTTON_LABEL,
  WALK_IN_UNSET_LABEL,
  normalizeWalkInUrl,
  resolveWalkInUrl,
  walkInButtonLabel,
  walkInPageUrl,
} from "@/lib/standalone/walk-in-link";

const exec = "https://script.google.com/macros/s/abc/exec";

describe("Walk-in button", () => {
  it("uses the staff label only when an https address is set", () => {
    expect(walkInButtonLabel("")).toBe(WALK_IN_UNSET_LABEL);
    expect(WALK_IN_UNSET_LABEL).toBe("Walk-in app not set up yet");
    expect(walkInButtonLabel("https://script.google.com/macros/s/abc/exec?page=walkin")).toBe(WALK_IN_BUTTON_LABEL);
    expect(WALK_IN_BUTTON_LABEL).toBe("Walk-in");
  });

  it("accepts an https Walk-in URL and rejects anything else", () => {
    expect(normalizeWalkInUrl("  https://example.com/walk  ")).toBe("https://example.com/walk");
    expect(normalizeWalkInUrl("http://example.com/walk")).toBeNull();
    expect(normalizeWalkInUrl("")).toBeNull();
    expect(normalizeWalkInUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeWalkInUrl("https://user:secret@example.com/walk")).toBeNull();
  });

  it("keeps a saved address ahead of the Apps Script default", () => {
    const fallback = walkInPageUrl(exec);
    expect(fallback).toBe(`${exec}?page=walkin`);
    expect(resolveWalkInUrl(null, fallback)).toBe(`${exec}?page=walkin`);
    expect(resolveWalkInUrl(null, "")).toBe("");
    expect(resolveWalkInUrl("https://example.com/front-desk", fallback)).toBe("https://example.com/front-desk");
    expect(resolveWalkInUrl("http://example.com/nope", fallback)).toBe("");
  });

  it("points the Apps Script default at the same web app", () => {
    expect(walkInPageUrl(exec)).toBe(`${exec}?page=walkin`);
    expect(walkInPageUrl(`${exec}?foo=1`)).toBe(`${exec}?foo=1&page=walkin`);
    expect(walkInPageUrl("")).toBe("");
    expect(walkInPageUrl("http://localhost:4173/advancement-office.html")).toBe("");
  });
});
