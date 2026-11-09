import { currentSchoolYear, schoolYears } from "@/lib/standalone/school-years";

export function SchoolYearBar({ years = schoolYears, year, onChange }: { years?: readonly string[]; year: string; onChange: (year: string) => void }) {
  return (
    <div className="grade-bar" role="toolbar" aria-label="School years">
      {years.map((level) => (
        <button key={level} type="button" className={year === level ? "btn primary" : "btn"} aria-pressed={year === level} onClick={() => onChange(level)}>
          {level}
        </button>
      ))}
    </div>
  );
}

export { currentSchoolYear };
