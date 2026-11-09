import { currentSchoolYear, schoolYears, type SchoolYear } from "@/lib/standalone/school-years";

export function SchoolYearBar({ year, onChange }: { year: SchoolYear; onChange: (year: SchoolYear) => void }) {
  return (
    <div className="grade-bar" role="toolbar" aria-label="School years">
      {schoolYears.map((level) => (
        <button key={level} type="button" className={year === level ? "btn primary" : "btn"} aria-pressed={year === level} onClick={() => onChange(level)}>
          {level}
        </button>
      ))}
    </div>
  );
}

export { currentSchoolYear };
