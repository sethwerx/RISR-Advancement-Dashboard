import type { OfficeTabId, OfficeTabPayload } from "@/lib/office/types";

/** RISR opened in 2019. Newest school year is first. 2026-2027 is the current year. */
export const schoolYears = [
  "2026-2027",
  "2025-2026",
  "2024-2025",
  "2023-2024",
  "2022-2023",
  "2021-2022",
  "2020-2021",
  "2019-2020",
] as const;

export type SchoolYear = (typeof schoolYears)[number];

export const currentSchoolYear: SchoolYear = "2026-2027";

export type YearMap = Record<SchoolYear, OfficeTabPayload | null>;

/**
 * Tabs that have one sheet per school year.
 * Add a section here to give another dashboard tab the same year buttons.
 * The current year reads `currentTitle`. `currentTitle 2026-2027` is an optional alias.
 * Older years read `currentTitle YYYY-YYYY`.
 */
export const yearTabSections = [
  {
    id: "student-list",
    currentTitle: "Student List",
    missing: (year: string) => `No student list found for ${year} yet`,
  },
  {
    id: "withdrawals",
    currentTitle: "Withdrawals",
    missing: (year: string) => `No withdrawals found for ${year} yet`,
  },
] as const satisfies readonly { id: OfficeTabId; currentTitle: string; missing: (year: string) => string }[];

export type YearTabId = (typeof yearTabSections)[number]["id"];

export type YearArchives = Record<YearTabId, YearMap>;

export function yearTabSection(id: string) {
  return yearTabSections.find((section) => section.id === id);
}

export function emptyYearMap(): YearMap {
  return Object.fromEntries(schoolYears.map((year) => [year, null])) as YearMap;
}

export function emptyYearArchives(): YearArchives {
  return Object.fromEntries(yearTabSections.map((section) => [section.id, emptyYearMap()])) as YearArchives;
}

/** Current year: the plain tab, then an optional "Title 2026-2027" alias. Past years: "Title YYYY-YYYY" only. */
export function yearTabNames(currentTitle: string, year: SchoolYear): string[] {
  if (year === currentSchoolYear) return [currentTitle, `${currentTitle} ${year}`];
  return [`${currentTitle} ${year}`];
}

/** The plain current-year tab is the one the morning sync already fills. Year aliases may be absent. */
export function yearTabIsRequired(title: string): boolean {
  return title === "Student List";
}

export function optionalYearTabTitles(): string[] {
  return yearTabSections.flatMap((section) =>
    schoolYears.flatMap((year) => yearTabNames(section.currentTitle, year).filter((title) => title !== section.currentTitle)),
  );
}

export function missingYearMessage(id: YearTabId, year: string): string {
  return yearTabSection(id)?.missing(year) ?? `No rows found for ${year} yet`;
}
