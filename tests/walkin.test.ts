import { describe, expect, it } from "vitest";
import { buildDescriptionPatch, buildWalkInEventBody, sendUpdatesFor } from "@/lib/calendar-payload";
import { matchRegistrations } from "@/lib/match";
import { notesSectionHtml, upsertNotesSection } from "@/lib/notes-format";
import { buildDescription, buildWalkInTitle } from "@/lib/title";
import { nextQuarterHourIct } from "@/lib/time";
import { buildWalkInDescription, parseWalkInFields } from "@/lib/walkin";
import { walkInFormFields } from "@/tabs/tours/walkinForm.config";
import type { TourNotes } from "@/lib/types";

const notes: TourNotes = {
  registrationId: 555,
  gradeOfInterest: "G3",
  leadSource: "School website",
  interestLevel: 4,
  concerns: ["Transport"],
  concernOther: "",
  nextStep: "Send application link",
  tourGuide: "Jordan Blake",
  comment: "Asked about the bus.",
  updatedAt: "2026-11-03T04:00:00.000Z",
};

describe("walk-in tours", () => {
  it("builds the walk-in title with and without a preferred name", () => {
    expect(
      buildWalkInTitle({ firstName: "Anan", preferredName: "Nong", lastName: "Siri", grade: "G3" }),
    ).toBe("Walk-in - Anan (Nong) Siri (G3)");
    expect(buildWalkInTitle({ firstName: "Anan", preferredName: "", lastName: "Siri", grade: "G3" })).toBe(
      "Walk-in - Anan Siri (G3)",
    );
  });

  it("declares the placeholder booking fields in one config", () => {
    const names = walkInFormFields.map((field) => field.name);
    expect(names).toEqual([
      "parentFirstName",
      "parentLastName",
      "email",
      "phone",
      "studentFirstName",
      "studentPreferredName",
      "studentLastName",
      "dateOfBirth",
      "gradeApplyingFor",
      "intendedStartDate",
      "hearAbout",
      "notes",
    ]);
  });

  it("rejects a submission that skips a required field", () => {
    expect(() => parseWalkInFields({ parentFirstName: "Ada" })).toThrow(/Parent last name/);
  });

  it("creates a calendar body with guests, a walk-in id, and no Meet link", () => {
    const body = buildWalkInEventBody({
      title: "Walk-in - Anan Siri (G3)",
      description: "Walk-in ID: 99001",
      startIso: "2026-11-03T10:00:00+07:00",
      endIso: "2026-11-03T12:00:00+07:00",
      guests: ["sethj@risr.ac.th", "passarananv@risr.ac.th"],
      walkInId: 99001,
    });
    expect(body).not.toHaveProperty("conferenceData");
    expect(sendUpdatesFor("create")).toBe("all");
    expect(JSON.stringify(body)).toContain("99001");
    expect(JSON.stringify(body)).not.toContain("oaRegistrationId");
  });

  it("rounds the walk-in start to the next quarter hour in ICT", () => {
    expect(nextQuarterHourIct(new Date("2026-11-03T03:01:00.000Z"))).toEqual({
      date: "2026-11-03",
      time: "10:15 AM",
    });
  });
});

describe("calendar notes section", () => {
  it("writes notes into the description and leaves the registration id in place", () => {
    const original = buildDescription([101], 555);
    const updated = upsertNotesSection(original, notesSectionHtml(notes));
    expect(updated).toContain("OA Registration ID: 555");
    expect(updated).toContain("<h3>Notes</h3>");
    expect(updated).toContain("Asked about the bus.");
    const again = upsertNotesSection(updated, notesSectionHtml({ ...notes, comment: "Updated comment" }));
    expect(again.match(/<h3>Notes<\/h3>/g)).toHaveLength(1);
    expect(again).toContain("Updated comment");
    expect(again).not.toContain("Asked about the bus.");
    const patch = buildDescriptionPatch(again);
    expect(patch).toEqual({ description: again });
    expect(patch).not.toHaveProperty("conferenceData");
    expect(sendUpdatesFor("update")).toBe("none");
  });

  it("keeps a walk-in id out of the OpenApply registration bullet", () => {
    const description = buildWalkInDescription({
      id: 99001,
      createdAt: "2026-11-03T03:00:00.000Z",
      parentFirstName: "Ada",
      parentLastName: "Siri",
      email: "ada@example.com",
      phone: "+66 00 000 0000",
      studentFirstName: "Anan",
      studentPreferredName: "Nong",
      studentLastName: "Siri",
      dateOfBirth: "2018-01-02",
      gradeApplyingFor: "G3",
      intendedStartDate: "2027-08-01",
      hearAbout: "Walk-in",
      notes: "Came to the desk.",
      date: "2026-11-03",
      time: "10:15 AM",
      calendarEventId: "walkin-99001",
    });
    expect(description).toContain("Walk-in ID:");
    expect(description).toContain("99001");
    expect(description).not.toContain("OA Registration ID");
    expect(description).toContain("<h3>Notes</h3>");
    const matches = matchRegistrations(
      [
        {
          id: 88001,
          eventId: 22965,
          eventLabel: "ES/MS/HS",
          date: "2026-11-03",
          time: "10:15 AM",
          state: "scheduled",
          host: "Jordan Blake",
          campus: "Ratchapruek",
          note: "",
          attendeesCount: 2,
          students: [
            {
              id: 1,
              firstName: "Anan",
              lastName: "Siri",
              preferredName: "Nong",
              grade: "G3",
              status: "Inquiry",
              thaiNickname: "",
              profileUrl: "",
            },
          ],
          parents: [],
        },
      ],
      [
        {
          id: "walkin-99001",
          title: "Walk-in - Anan (Nong) Siri (G3)",
          description,
          startIso: "2026-11-03T10:15:00+07:00",
          endIso: "2026-11-03T12:15:00+07:00",
          htmlLink: "",
          registrationId: null,
          notesDocUrl: "",
          kind: "walk-in",
        },
      ],
      120,
    );
    expect(matches[0].event).toBeNull();
    expect(matches[0].status).toBe("missing");
  });
});
