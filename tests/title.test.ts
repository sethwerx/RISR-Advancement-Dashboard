import { describe, expect, it } from "vitest";
import { buildDescription, buildTourTitle, extractRegistrationId, notesDocumentName, withNoShowTag, withoutNoShowTag } from "@/lib/title";

const anan = { firstName: "Anan", lastName: "Siri", preferredName: "Nong", grade: "G3" };
const ananPlain = { firstName: "Anan", lastName: "Siri", preferredName: "", grade: "G3" };
const malee = { firstName: "Malee", lastName: "Siri", preferredName: "Lee", grade: "G1" };
const maleePlain = { firstName: "Malee", lastName: "Siri", grade: "G1" };

describe("tour titles", () => {
  it("puts the preferred name in brackets between first and last", () => {
    expect(buildTourTitle([anan])).toBe("Tour (OA) - Anan (Nong) Siri (G3)");
  });

  it("uses First Last when there is no preferred name", () => {
    expect(buildTourTitle([ananPlain])).toBe("Tour (OA) - Anan Siri (G3)");
    expect(buildTourTitle([{ ...anan, preferredName: "   " }])).toBe("Tour (OA) - Anan Siri (G3)");
  });

  it("joins siblings with &", () => {
    expect(buildTourTitle([anan, malee])).toBe("Tour (OA) - Anan (Nong) Siri (G3) & Malee (Lee) Siri (G1)");
    expect(buildTourTitle([anan, maleePlain])).toBe("Tour (OA) - Anan (Nong) Siri (G3) & Malee Siri (G1)");
  });

  it("adds the no-show tag after (OA)", () => {
    expect(buildTourTitle([anan], true)).toBe("Tour (OA) [No Show] - Anan (Nong) Siri (G3)");
    expect(withNoShowTag("Tour (OA) - Anan (Nong) Siri (G3)")).toBe("Tour (OA) [No Show] - Anan (Nong) Siri (G3)");
    expect(withNoShowTag("Tour (OA) [No Show] - Anan (Nong) Siri (G3)")).toBe(
      "Tour (OA) [No Show] - Anan (Nong) Siri (G3)",
    );
  });

  it("removes the no-show tag without disturbing the name", () => {
    expect(withoutNoShowTag("Tour (OA) [No Show] - Anan (Nong) Siri (G3)")).toBe("Tour (OA) - Anan (Nong) Siri (G3)");
  });

  it("names the notes doc from the children", () => {
    expect(notesDocumentName([anan, maleePlain])).toBe("Notes - Tour - Anan (Nong) Siri (G3) & Malee Siri (G1)");
  });

  it("includes one profile link per child and the registration id", () => {
    const html = buildDescription([101, 102], 555);
    expect(html).toContain("https://risr.openapply.com/admin/students/101");
    expect(html).toContain("https://risr.openapply.com/admin/students/102");
    expect(html).toContain("<li>OA Registration ID: 555</li>");
    expect(html).toContain("<i>Refer to the Notes for details</i>");
    expect(extractRegistrationId(html)).toBe(555);
  });
});
