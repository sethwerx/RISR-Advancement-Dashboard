import { describe, expect, it } from "vitest";
import { buildDescriptionPatch, buildWalkInEventBody, sendUpdatesFor } from "@/lib/calendar-payload";
import { matchRegistrations } from "@/lib/match";
import { notesSectionHtml, upsertNotesSection } from "@/lib/notes-format";
import { buildDescription, buildWalkInTitle } from "@/lib/title";
import { walkInDurationMinutes, walkInFormFields } from "@/tabs/tours/walkinForm.config";
import { tourInterval } from "@/lib/time";
import { buildWalkInDescription, parseWalkInFields, walkInRecordFromFields, walkInRecordToTour, walkInTitleFor } from "@/lib/walkin";
import type { TourNotes } from "@/lib/types";

function sampleWalkIn(): Record<string, string> {
  return {
    event_id: "22965 Tour for Elementary, Middle or High School Program",
    date: "2026-11-04",
    time: "08:00 AM",
    attendees_count: "3",
    campus: "Ruamrudee International School, Ratchapruek Campus",
    note: "Came to the desk.",
    "student.first_name": "Anan",
    "student.last_name": "Siri",
    "student.birth_date": "2018-01-02",
    "student.gender": "Male",
    "student.grade": "Grade 3",
    "student.enrollment_year": "2027",
    "student.custom_fields.thai_nickname": "Nong",
    "student.custom_fields.referral_source_custom": "Friends",
    "parent.first_name": "Ada",
    "parent.last_name": "Siri",
    "parent.email": "ada@example.com",
    "parent.custom_fields.mobile_phone": "+66 00 000 0000",
    "parent.parent_role": "Mother",
  };
}

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

  it("uses the inferred OpenApply tour fields, including the two-hour slots", () => {
    expect(walkInFormFields).toHaveLength(28);
    expect(walkInFormFields.map((field) => field.name)).toContain("student.custom_fields.referral_source_custom");
    expect(walkInFormFields.find((field) => field.name === "time")?.options).toEqual(["08:00 AM", "10:00 AM"]);
    expect(walkInDurationMinutes).toBe(120);
    expect(tourInterval("2026-11-04", "08:00 AM", walkInDurationMinutes)).toEqual({
      start: "2026-11-04T08:00:00+07:00",
      end: "2026-11-04T10:00:00+07:00",
    });
    expect(tourInterval("2026-11-04", "10:00 AM", walkInDurationMinutes).end).toBe("2026-11-04T12:00:00+07:00");
  });

  it("rejects a submission that skips a required field or uses a slot outside 8:00 and 10:00", () => {
    expect(() => parseWalkInFields({ "parent.first_name": "Ada" })).toThrow(/Tour type is required/);
    const values = sampleWalkIn();
    expect(() => parseWalkInFields({ ...values, time: "09:00 AM" })).toThrow(/Time slot/);
  });

  it("books the chosen slot and uses the nickname in the walk-in title", () => {
    const record = walkInRecordFromFields(parseWalkInFields(sampleWalkIn()), 99001, "walkin-99001");
    expect(record.date).toBe("2026-11-04");
    expect(record.time).toBe("08:00 AM");
    expect(record.eventId).toBe(22965);
    expect(walkInTitleFor(record)).toBe("Walk-in - Anan (Nong) Siri (Grade 3)");
    const tour = walkInRecordToTour(record, null, null, null);
    expect(tour.source).toBe("Walk-in");
    expect(tour.endIso).toBe("2026-11-04T10:00:00+07:00");
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
    const record = walkInRecordFromFields(parseWalkInFields(sampleWalkIn()), 99001, "walkin-99001");
    const description = buildWalkInDescription(record);
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
          date: "2026-11-04",
          time: "08:00 AM",
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
          startIso: "2026-11-04T08:00:00+07:00",
          endIso: "2026-11-04T10:00:00+07:00",
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
