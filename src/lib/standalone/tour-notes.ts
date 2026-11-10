import { CONCERNS, LEAD_SOURCES, NEXT_STEPS } from "@/lib/constants";
import { NOTES_SECTION_END, NOTES_SECTION_START } from "@/lib/notes-format";

/** The admissions template is only a pattern. This id must never be written. */
export const TOUR_NOTES_TEMPLATE_DOC_ID = "1OC8AxiBwOiYAloJGZFfuq-cuLCTXrjzkyL9jIBHr1Z8";

export const tourNotesTemplate = [
  "Grade of interest: ",
  "Lead source: ",
  "Interest level: ",
  "Concerns: ",
  "Next step: ",
  "Tour guide: ",
  "Notes: ",
].join("\n");

export const tourNoteInserts = [
  ...LEAD_SOURCES.map((item) => `Lead source: ${item}`),
  ...CONCERNS.map((item) => `Concerns: ${item}`),
  ...NEXT_STEPS.map((item) => `Next step: ${item}`),
];

export function stripNoteHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h3)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function notesFromDescription(description: string): string {
  const match = description.match(new RegExp(`${NOTES_SECTION_START}([\\s\\S]*?)${NOTES_SECTION_END}`));
  return match ? stripNoteHtml(match[1]) : "";
}

/** Put notes in the marked section. Text outside that section, including an existing registration id, stays as it is. */
export function descriptionWithNotes(description: string, notes: string): string {
  const block = `${NOTES_SECTION_START}\n${notes.trim()}\n${NOTES_SECTION_END}`;
  const pattern = new RegExp(`${NOTES_SECTION_START}[\\s\\S]*?${NOTES_SECTION_END}`);
  if (pattern.test(description)) return description.replace(pattern, block);
  const base = description.trim();
  return base ? `${base}\n\n${block}` : block;
}

export function mergeDashboardComment(notes: string, localComment: string): { text: string; migrated: boolean } {
  const comment = localComment.trim();
  if (!comment || notes.includes(comment)) return { text: notes, migrated: false };
  const base = notes.trim();
  const text = base ? `${base}\n\nDashboard comment:\n${comment}` : comment;
  return { text, migrated: true };
}

export function notesForEditor(input: { description: string; docText: string; localComment: string }): { text: string; migrated: boolean } {
  const fromCalendar = notesFromDescription(input.description);
  const doc = input.docText.trim();
  const base = fromCalendar || doc;
  const merged = mergeDashboardComment(base, input.localComment);
  if (merged.text.trim()) return merged;
  return { text: tourNotesTemplate, migrated: false };
}

export function tourNotesAttachment(attachments: Array<{ title?: string; fileId?: string; fileUrl?: string }> | undefined): { fileId: string; fileUrl: string } | null {
  const found = (attachments ?? []).find((item) => item.title === "Tour Notes" && item.fileId && item.fileId !== TOUR_NOTES_TEMPLATE_DOC_ID);
  if (!found?.fileId) return null;
  return { fileId: found.fileId, fileUrl: found.fileUrl || `https://docs.google.com/document/d/${found.fileId}/edit` };
}

export function plainTextFromDoc(doc: { body?: { content?: Array<{ paragraph?: { elements?: Array<{ textRun?: { content?: string } }> } }> } }): string {
  const parts: string[] = [];
  for (const block of doc.body?.content ?? []) {
    for (const element of block.paragraph?.elements ?? []) {
      if (element.textRun?.content) parts.push(element.textRun.content);
    }
  }
  return parts.join("").trim();
}

export function docEndIndex(doc: { body?: { content?: Array<{ endIndex?: number }> } }): number {
  const content = doc.body?.content ?? [];
  const end = content.length ? content[content.length - 1].endIndex ?? 2 : 2;
  return end;
}
