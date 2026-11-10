import { formatClock, parseClock } from "@/lib/time";
import { formatDayHeading } from "@/lib/standalone/tour-groups";

export type AssessmentEvent = {
  date: string;
  start: string;
  end: string;
  student: string;
  grade: string;
  tests: string[];
  assessor: string;
  location: string;
  status: string;
  eventId: string;
  calendarLink: string;
};

export type EldTeacher = { teacher: string; email: string; grades: string[]; notes: string };
export type RotationDay = { date: string; letter: string; weekday: string };
export type FreeBlock = { teacher: string; letter: string; block: string; start: string; end: string; freeMinutes: number };
export type NewStudent = {
  studentId: string;
  name: string;
  nickname: string;
  grade: string;
  startDate: string;
  startNote: string;
  className: string;
  letterSent: string;
  paymentStatus: string;
  scholarshipType: string;
  eldFlag: string;
  status: string;
  notes: string;
  sourceTab: string;
};

export type WidaSlot = {
  date: string;
  heading: string;
  teacher: string;
  slotStart: string;
  slotEnd: string;
  blockStart: string;
  blockEnd: string;
};

export type WidaSuggestion = {
  teachers: EldTeacher[];
  slots: WidaSlot[];
  warning: string;
  message: string;
  title: string;
};

export const widaGrades = ["PreK", "KG", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"] as const;

export const PAST_ASSESSMENTS_FROM = "2026-08-01";

export const newStudentYears = [
  { year: "2027-2028", sheets: ["New Students 2027-2028"] },
  { year: "2026-2027", sheets: ["New Students", "New Students 2026-2027"] },
  { year: "2025-2026", sheets: ["New Students 2025-2026"] },
  { year: "2024-2025", sheets: ["New Students 2024-2025"] },
  { year: "2023-2024", sheets: ["New Students 2023-2024"] },
] as const;

export const currentNewStudentYear = "2026-2027";

export type ScheduleBundle = {
  assessments: AssessmentEvent[];
  teachers: EldTeacher[];
  rotation: RotationDay[];
  blocks: FreeBlock[];
  newStudents: Record<string, NewStudent[] | null>;
};

export function emptyScheduleBundle(): ScheduleBundle {
  return { assessments: [], teachers: [], rotation: [], blocks: [], newStudents: {} };
}

export function readScheduleBundle(sheets: Record<string, string[][] | undefined>): ScheduleBundle {
  return {
    assessments: readAssessments(sheets.Assessments),
    teachers: readEldTeachers(sheets["ELD Teachers"]),
    rotation: readRotationDays(sheets["Rotation Days"]),
    blocks: readFreeBlocks(sheets["ELD Free Blocks"]),
    newStudents: readNewStudentYears(sheets),
  };
}

export function optionalScheduleTitles(): string[] {
  return ["New Students", "ELD Teachers", "Rotation Days", "ELD Free Blocks", ...newStudentYears.flatMap((item) => item.sheets.filter((sheet) => sheet !== "New Students"))];
}

export function parseSheetDate(value: string): string {
  const text = value.trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const named = text.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/);
  if (named) {
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const month = months.findIndex((item) => named[2].toLowerCase().startsWith(item));
    if (month >= 0) return `${named[3]}-${String(month + 1).padStart(2, "0")}-${String(Number(named[1])).padStart(2, "0")}`;
  }
  return "";
}

function clockMinutes(value: string): number | null {
  try {
    const parsed = parseClock(value);
    return parsed.hours * 60 + parsed.minutes;
  } catch {
    return null;
  }
}

function clockLabel(total: number): string {
  return formatClock(Math.floor(total / 60) % 24, total % 60);
}

function tableRows(values: string[][] | undefined): Record<string, string>[] {
  if (!values || values.length < 2) return [];
  const header = values[0].map((cell) => cell.trim());
  return values.slice(1).flatMap((raw) => {
    if (!raw.some((cell) => cell?.trim())) return [];
    const record: Record<string, string> = {};
    header.forEach((name, index) => {
      if (name) record[name] = (raw[index] ?? "").trim();
    });
    return [record];
  });
}

export function readAssessments(values: string[][] | undefined): AssessmentEvent[] {
  return tableRows(values).flatMap((row) => {
    const student = row.Student || row.Name || "";
    if (!student && !row.Date) return [];
    const tests = (row.Tests || "").split(",").map((item) => item.trim()).filter(Boolean);
    return [{
      date: parseSheetDate(row.Date || ""),
      start: row.Start || "",
      end: row.End || "",
      student,
      grade: row.Grade || "",
      tests,
      assessor: row.Assessor || "",
      location: row.Location || "",
      status: row.Status || "",
      eventId: row["Event ID"] || "",
      calendarLink: row["Calendar link"] || "",
    }];
  });
}

export function assessmentCountLabel(count: number): string {
  return count === 1 ? "1 assessment" : `${count} assessments`;
}

export function splitAssessments(rows: AssessmentEvent[], today: string): { upcoming: { heading: string; items: AssessmentEvent[] }[]; past: { heading: string; items: AssessmentEvent[] }[]; postponed: AssessmentEvent[] } {
  const upcoming: AssessmentEvent[] = [];
  const past: AssessmentEvent[] = [];
  const postponed: AssessmentEvent[] = [];
  for (const row of rows) {
    const status = row.status.trim().toLowerCase();
    if (status === "postponed") {
      postponed.push(row);
      continue;
    }
    const future = row.date >= today;
    if ((status === "upcoming" || !status) && future) upcoming.push(row);
    else if (row.date >= PAST_ASSESSMENTS_FROM && (row.date < today || status === "done")) past.push(row);
  }
  const group = (items: AssessmentEvent[], descending: boolean) => {
    const map = new Map<string, AssessmentEvent[]>();
    for (const item of items) {
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    }
    return [...map.entries()]
      .sort((left, right) => (descending ? right[0].localeCompare(left[0]) : left[0].localeCompare(right[0])))
      .map(([date, day]) => ({
        heading: `${formatDayHeading(date)} · ${assessmentCountLabel(day.length)}`,
        items: [...day].sort((left, right) => (clockMinutes(left.start) ?? 9999) - (clockMinutes(right.start) ?? 9999)),
      }));
  };
  postponed.sort((left, right) => left.date.localeCompare(right.date) || (clockMinutes(left.start) ?? 0) - (clockMinutes(right.start) ?? 0));
  return { upcoming: group(upcoming, false), past: group(past, true), postponed };
}

function gradeKey(value: string): string {
  const text = value.trim().toLowerCase().replace(/\./g, "").replace(/-/g, " ").replace(/\s+/g, " ");
  if (/pre\s*k|prek|^pk$|^prek$/.test(text)) return "prek";
  if (/^(kg|kindergarten|k)$/.test(text)) return "kg";
  const numbered = text.match(/(?:grade|gr|g)\s*(\d{1,2})$/);
  if (numbered) return `g${Number(numbered[1])}`;
  return text;
}

export function blockedEldGrade(grade: string): boolean {
  const key = gradeKey(grade);
  return key === "prek" || key === "kg" || key === "g1";
}

export function teacherFirstName(name: string): string {
  const cleaned = name.replace(/^(ms|mr|mrs|miss|dr)\.?\s+/i, "").trim();
  return cleaned.split(/\s+/)[0] ?? "";
}

function samePerson(left: string, right: string): boolean {
  const first = teacherFirstName(left).toLowerCase();
  return Boolean(first) && right.toLowerCase().includes(first);
}

export function readEldTeachers(values: string[][] | undefined): EldTeacher[] {
  return tableRows(values).flatMap((row) => {
    const teacher = row.Teacher || "";
    if (!teacher) return [];
    return [{ teacher, email: row.Email || "", grades: (row["Grades taught"] || "").split(",").map((item) => item.trim()).filter(Boolean), notes: row.Notes || "" }];
  });
}

export function readRotationDays(values: string[][] | undefined): RotationDay[] {
  return tableRows(values).flatMap((row) => {
    const letter = (row["Day letter"] || "").trim().toUpperCase();
    const date = parseSheetDate(row.Date || "");
    const school = (row["School day"] || "").trim().toLowerCase();
    if (!date || !/^[ABCD]$/.test(letter)) return [];
    if (school && /^(no|n|holiday|closed|false|0)$/.test(school)) return [];
    return [{ date, letter, weekday: row.Weekday || "" }];
  });
}

export function readFreeBlocks(values: string[][] | undefined): FreeBlock[] {
  return tableRows(values).flatMap((row) => {
    const teacher = row.Teacher || "";
    const letter = (row["Rotation day"] || "").trim().toUpperCase();
    const start = row.Start || "";
    if (!teacher || !/^[ABCD]$/.test(letter) || !start) return [];
    return [{ teacher, letter, block: row.Block || "", start, end: row.End || "", freeMinutes: Number(row["Free minutes"] || 0) }];
  });
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && startB < endA;
}

export function suggestWidaSlots(input: { student: string; grade: string; test: string; duration: number; today: string; teachers: EldTeacher[]; rotation: RotationDay[]; blocks: FreeBlock[]; assessments: AssessmentEvent[] }): WidaSuggestion {
  const titleName = input.student.trim() || "Student";
  const emptyTitle = `Assessment (${input.test || "WIDA"}) [] - ${titleName} (${input.grade}), Y2026/27`;
  if (blockedEldGrade(input.grade)) {
    return { teachers: [], slots: [], warning: "", message: "No ELD teacher for this grade", title: emptyTitle };
  }
  const wanted = gradeKey(input.grade);
  const teachers = input.teachers.filter((teacher) => teacher.grades.some((grade) => gradeKey(grade) === wanted));
  if (!teachers.length) {
    return { teachers: [], slots: [], warning: "", message: "No ELD teacher for this grade", title: emptyTitle };
  }
  const warning = teachers.some((teacher) => /incomplete/i.test(teacher.notes)) ? "This teacher's timetable is incomplete." : "";
  const upcoming = input.assessments.filter((item) => item.status.trim().toLowerCase() === "upcoming" && item.date);
  const slots: WidaSlot[] = [];
  const days = input.rotation.filter((day) => day.date > input.today).sort((left, right) => left.date.localeCompare(right.date));
  for (const day of days) {
    for (const teacher of teachers) {
      const blocks = input.blocks.filter((block) => block.letter === day.letter && samePerson(block.teacher, teacher.teacher) && block.freeMinutes >= input.duration);
      for (const block of blocks) {
        const start = clockMinutes(block.start);
        if (start == null) continue;
        const endLimit = clockMinutes(block.end);
        const slotEnd = start + input.duration;
        if (endLimit != null && slotEnd > endLimit) continue;
        const taken = upcoming.some((item) => {
          if (item.date !== day.date || !samePerson(teacher.teacher, item.assessor)) return false;
          const eventStart = clockMinutes(item.start);
          if (eventStart == null) return false;
          const eventEnd = clockMinutes(item.end) ?? eventStart + 90;
          return rangesOverlap(start, slotEnd, eventStart, eventEnd);
        });
        if (taken) continue;
        slots.push({
          date: day.date,
          heading: formatDayHeading(day.date),
          teacher: teacher.teacher,
          slotStart: clockLabel(start),
          slotEnd: clockLabel(slotEnd),
          blockStart: block.start,
          blockEnd: block.end,
        });
      }
    }
  }
  slots.sort((left, right) => left.date.localeCompare(right.date) || (clockMinutes(left.slotStart) ?? 0) - (clockMinutes(right.slotStart) ?? 0));
  const first = slots.slice(0, 5);
  const message = first.length < 5 ? `Fewer than 5 open slots (${first.length}).` : "";
  const assessor = first[0] ? teacherFirstName(first[0].teacher) : teacherFirstName(teachers[0].teacher);
  return { teachers, slots: first, warning, message, title: widaCalendarTitle(input.test || "WIDA", assessor, titleName, input.grade) };
}

export function widaCalendarTitle(test: string, assessorFirst: string, student: string, grade: string): string {
  return `Assessment (${test}) [${assessorFirst}] - ${student} (${grade}), Y2026/27`;
}

export function readNewStudents(values: string[][] | undefined, sourceTab: string): NewStudent[] | null {
  if (!values?.length || !values[0].some((cell) => cell.trim())) return null;
  return tableRows(values).map((row) => ({
    studentId: row["Student ID"] || "",
    name: row.Name || "",
    nickname: row.Nickname || "",
    grade: row.Grade || "",
    startDate: row["Start date"] || "",
    startNote: row["Start note"] || "",
    className: row.Class || "",
    letterSent: row["Letter sent"] || "",
    paymentStatus: row["Payment status"] || "",
    scholarshipType: row["Scholarship type"] || "",
    eldFlag: row["ELD/LS flag"] || "",
    status: row.Status || "",
    notes: row.Notes || "",
    sourceTab: row["Source year tab"] || sourceTab,
  }));
}

export function readNewStudentYears(sheets: Record<string, string[][] | undefined>): Record<string, NewStudent[] | null> {
  const result: Record<string, NewStudent[] | null> = {};
  for (const item of newStudentYears) {
    const present = item.sheets.flatMap((title) => {
      const values = sheets[title];
      return values?.length ? [{ title, values }] : [];
    });
    const withRows = present.filter((entry) => entry.values.length > 1 && entry.values.slice(1).some((row) => row.some((cell) => cell?.trim())));
    const chosen = withRows[0] ?? present.find((entry) => entry.values[0]?.some((cell) => cell.trim()));
    result[item.year] = chosen ? readNewStudents(chosen.values, chosen.title) : null;
  }
  return result;
}

export function newStudentIsInactive(row: NewStudent): boolean {
  return /cancel|defer/i.test(row.status);
}

export function newStudentSummary(rows: NewStudent[]): { active: number; payments: { label: string; count: number }[]; lettersSent: number; lettersSigned: number; classAssigned: number; idAssigned: number } {
  const activeRows = rows.filter((row) => !newStudentIsInactive(row));
  const payments = new Map<string, number>();
  for (const row of activeRows) {
    const label = row.paymentStatus || "Not recorded";
    payments.set(label, (payments.get(label) ?? 0) + 1);
  }
  return {
    active: activeRows.length,
    payments: [...payments.entries()].map(([label, count]) => ({ label, count })),
    lettersSent: activeRows.filter((row) => row.letterSent.trim() && !/^(no|not sent)$/i.test(row.letterSent.trim())).length,
    lettersSigned: activeRows.filter((row) => /sign/i.test(row.letterSent)).length,
    classAssigned: activeRows.filter((row) => row.className.trim()).length,
    idAssigned: activeRows.filter((row) => row.studentId.trim()).length,
  };
}

export function missingNewStudentsMessage(year: string): string {
  return `No new students found for ${year} yet`;
}
