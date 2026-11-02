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
