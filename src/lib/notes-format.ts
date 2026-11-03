import { INTEREST_LABELS } from "@/lib/constants";
import type { TourNotes } from "@/lib/types";

export function formatNotesBlock(input: {
  displayName: string;
  date: string;
  timeLabel: string;
  notes: TourNotes;
}): string {
  const concerns = [...input.notes.concerns];
  if (input.notes.concernOther.trim()) concerns.push(`Other: ${input.notes.concernOther.trim()}`);
  const levelLabel = INTEREST_LABELS[input.notes.interestLevel];
  return [
    `Tour notes — ${input.displayName}`,
    `When: ${input.date} ${input.timeLabel} (Asia/Bangkok)`,
    `Grade of interest: ${input.notes.gradeOfInterest}`,
    `Lead source: ${input.notes.leadSource}`,
    `Interest level: ${input.notes.interestLevel}${levelLabel ? ` (${levelLabel})` : ""}`,
    `Concerns: ${concerns.join(", ") || "—"}`,
    `Next step: ${input.notes.nextStep}`,
    `Tour guide: ${input.notes.tourGuide}`,
    `Comment: ${input.notes.comment || "—"}`,
    `Recorded: ${input.notes.updatedAt}`,
  ].join("\n");
}

export const NOTES_SECTION_START = "<!-- RISR-NOTES-START -->";
export const NOTES_SECTION_END = "<!-- RISR-NOTES-END -->";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Visible Notes block stored inside a calendar description. */
export function notesSectionHtml(notes: TourNotes): string {
  const concerns = [...notes.concerns];
  if (notes.concernOther.trim()) concerns.push(`Other: ${notes.concernOther.trim()}`);
  const levelLabel = INTEREST_LABELS[notes.interestLevel];
  const rows = [
    ["Grade of interest", notes.gradeOfInterest],
    ["Lead source", notes.leadSource],
    ["Interest level", `${notes.interestLevel}${levelLabel ? ` (${levelLabel})` : ""}`],
    ["Concerns", concerns.join(", ") || "—"],
    ["Next step", notes.nextStep],
    ["Tour guide", notes.tourGuide],
    ["Comment", notes.comment || "—"],
  ];
  const items = rows.map(([label, value]) => `<li><b>${escapeHtml(label)}:</b> ${escapeHtml(value)}</li>`).join("");
  return `${NOTES_SECTION_START}<h3>Notes</h3><ul>${items}</ul>${NOTES_SECTION_END}`;
}

/** Replace the Notes section and leave the rest of the description, including the registration id, intact. */
export function upsertNotesSection(description: string, notesHtml: string): string {
  const pattern = new RegExp(`${NOTES_SECTION_START}[\\s\\S]*?${NOTES_SECTION_END}`);
  if (pattern.test(description)) return description.replace(pattern, notesHtml);
  return `${description}${notesHtml}`;
}

export function initialNotesDocBody(name: string): string {
  return [
    name,
    "",
    "Copied from the admissions tour-notes template.",
    "",
    "Refer to the notes below for what the family shared on the tour.",
    "",
  ].join("\n");
}
