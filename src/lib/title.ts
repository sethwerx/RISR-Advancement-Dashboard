import { dashboardConfig } from "@/config/dashboard.config";

export type TitleStudent = {
  firstName: string;
  lastName: string;
  preferredName?: string | null;
  grade?: string | null;
};

export function formatPersonName(student: {
  firstName: string;
  lastName: string;
  preferredName?: string | null;
}): string {
  const first = student.firstName.trim();
  const last = student.lastName.trim();
  const preferred = student.preferredName?.trim();
  if (preferred) return `${first} (${preferred}) ${last}`;
  return `${first} ${last}`;
}

export function formatStudentWithGrade(student: TitleStudent): string {
  const grade = student.grade?.trim() || "Ungraded";
  return `${formatPersonName(student)} (${grade})`;
}

/** `Tour (OA) - First (Preferred) Last (Grade)`, siblings joined with " & ". */
export function buildTourTitle(students: TitleStudent[], noShow = false): string {
  const names = students.map(formatStudentWithGrade).join(" & ");
  const head = noShow ? "Tour (OA) [No Show]" : "Tour (OA)";
  return `${head} - ${names}`;
}

/** `Walk-in - First (Preferred) Last (Grade)`. */
export function buildWalkInTitle(student: TitleStudent): string {
  return `Walk-in - ${formatStudentWithGrade(student)}`;
}

export function notesDocumentName(students: TitleStudent[]): string {
  return `Notes - Tour - ${students.map(formatStudentWithGrade).join(" & ")}`;
}

export function isNoShowTitle(title: string): boolean {
  return /\[No Show\]/i.test(title);
}

/** Insert `[No Show]` immediately after `(OA)`, leaving the rest of the title intact. */
export function withNoShowTag(title: string): string {
  if (isNoShowTitle(title)) return title;
  const token = "(OA)";
  const at = title.indexOf(token);
  if (at >= 0) {
    const end = at + token.length;
    return `${title.slice(0, end)} [No Show]${title.slice(end)}`;
  }
  return `${title} [No Show]`;
}

export function withoutNoShowTag(title: string): string {
  return title.replace(/\s*\[No Show\]/gi, "").replace(/[ \t]{2,}/g, " ").trim();
}

export function studentProfileUrl(id: number): string {
  return dashboardConfig.openApply.profileUrlTemplate.replaceAll("{id}", String(id));
}

/**
 * One profile bullet per child, the registration id used for matching,
 * and the notes reminder. OpenApply is read-only; this is display text only.
 */
export function buildDescription(studentIds: number[], registrationId: number): string {
  const profiles = studentIds
    .map((id) => {
      const url = studentProfileUrl(id);
      return `<li><b>OpenApply Profile:</b> <a href="${url}">${url}</a></li>`;
    })
    .join("");
  return `<ul>${profiles}<li>OA Registration ID: ${registrationId}</li></ul><ul><li><i>Refer to the Notes for details</i></li></ul>`;
}

export function extractRegistrationId(description: string | null | undefined): number | null {
  if (!description) return null;
  const match = description.match(/OA Registration ID:\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}
