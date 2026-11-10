import { describe, expect, it } from "vitest";
import { descriptionWithNotes, mergeDashboardComment, notesForEditor, notesFromDescription, tourNotesAttachment, tourNotesTemplate } from "@/lib/standalone/tour-notes";

describe("tour notes sync", () => {
  it("keeps an existing registration id and does not add one", () => {
    const original = "Profile: https://example.test\nOA Registration ID: 88001";
    const updated = descriptionWithNotes(original, "Grade of interest: G3\nNotes: Family asked about buses");
    expect(updated).toContain("OA Registration ID: 88001");
    expect(updated.match(/OA Registration ID/g)).toHaveLength(1);
    expect(notesFromDescription(updated)).toContain("Family asked about buses");
    const fresh = descriptionWithNotes("", tourNotesTemplate);
    expect(fresh).not.toMatch(/OA Registration ID/i);
    expect(notesFromDescription(fresh)).toContain("Lead source:");
  });

  it("appends a dashboard comment without dropping calendar notes", () => {
    const merged = mergeDashboardComment("Grade of interest: G5\nNotes: Liked the library", "Asked about the bus");
    expect(merged.migrated).toBe(true);
    expect(merged.text).toContain("Liked the library");
    expect(merged.text).toContain("Dashboard comment:\nAsked about the bus");
    expect(mergeDashboardComment(merged.text, "Asked about the bus").migrated).toBe(false);
  });

  it("prefills the template and ignores the template file itself", () => {
    expect(notesForEditor({ description: "", docText: "", localComment: "" }).text).toBe(tourNotesTemplate);
    expect(tourNotesAttachment([{ title: "Tour Notes", fileId: "1OC8AxiBwOiYAloJGZFfuq-cuLCTXrjzkyL9jIBHr1Z8" }])).toBeNull();
    expect(tourNotesAttachment([{ title: "Tour Notes", fileId: "doc-1", fileUrl: "https://docs.google.com/document/d/doc-1/edit" }])?.fileId).toBe("doc-1");
  });
});
