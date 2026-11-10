import { useMemo, useState, type FormEvent } from "react";
import { canonicalGrade, filterStudentsByGrade, studentGradeLevels } from "@/lib/standalone/grades";
import { syncControlLabel } from "@/lib/standalone/tabs";
import { gradeButtonsForRows } from "@/lib/standalone/student-years";
import {
  assessmentCountLabel,
  currentNewStudentYear,
  missingNewStudentsMessage,
  newStudentIsInactive,
  newStudentSummary,
  newStudentYears,
  splitAssessments,
  suggestWidaSlots,
  widaGrades,
  type AssessmentEvent,
  type NewStudent,
  type ScheduleBundle,
} from "@/lib/standalone/schedule";
import { SchoolYearBar } from "./SchoolYearBar";

function SyncTabButton({ busy, onSync }: { busy: boolean; onSync: () => void }) {
  return (
    <button className="btn primary" type="button" data-sync="tab" disabled={busy} title="Runs the OA tours, calendar, and master sheet sync through the bot." onClick={onSync}>
      {busy ? "Requesting…" : syncControlLabel}
    </button>
  );
}

function AssessmentCards({ items }: { items: AssessmentEvent[] }) {
  return (
    <div className="card-row">
      {items.map((item) => (
        <article key={`${item.date}-${item.start}-${item.student}`} className="card assessment-card">
          <strong>{item.student}</strong>
          {item.grade ? <span className="chip">{item.grade}</span> : null}
          {item.tests.map((test) => <span key={test} className="chip">{test}</span>)}
          <p className="lede">{[item.start && item.end ? `${item.start}–${item.end}` : item.start, item.assessor, item.location].filter(Boolean).join(" · ")}</p>
          {item.calendarLink ? <a href={item.calendarLink} target="_blank" rel="noreferrer">Calendar event</a> : null}
        </article>
      ))}
    </div>
  );
}

export function AssessmentsPanel({ schedule, today, syncing, onSync }: { schedule: ScheduleBundle; today: string; syncing: boolean; onSync: () => void }) {
  const grouped = splitAssessments(schedule.assessments, today);
  const [student, setStudent] = useState("");
  const [grade, setGrade] = useState("Grade 2");
  const [test, setTest] = useState("WIDA");
  const [duration, setDuration] = useState(90);
  const [result, setResult] = useState<ReturnType<typeof suggestWidaSlots> | null>(null);
  const [copied, setCopied] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    setCopied("");
    setResult(suggestWidaSlots({ student, grade, test, duration, today, teachers: schedule.teachers, rotation: schedule.rotation, blocks: schedule.blocks, assessments: schedule.assessments }));
  }

  async function copyTitle() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.title);
      setCopied("Copied.");
    } catch {
      setCopied(result.title);
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h2>Assessments</h2>
          <p className="lede">Upcoming assessments are grouped by date. Times are Asia/Bangkok. The booking helper does not write to the calendar.</p>
        </div>
        <SyncTabButton busy={syncing} onSync={onSync} />
      </div>
      <form className="card" onSubmit={submit}>
        <h3 className="font-heading">WIDA booking helper</h3>
        <div className="grid-2">
          <label>Student name<input value={student} onChange={(event) => setStudent(event.target.value)} required /></label>
          <label>Grade<select value={grade} onChange={(event) => setGrade(event.target.value)}>{widaGrades.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Test<input value={test} onChange={(event) => setTest(event.target.value)} /></label>
          <label>Duration
            <select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
              <option value={90}>90 min</option>
              <option value={120}>120 min</option>
            </select>
          </label>
        </div>
        <button className="btn primary" type="submit">Find slots</button>
      </form>
      {result ? (
        <div className="card" role="status">
          <h3 className="font-heading">{result.teachers.length ? result.teachers.map((teacher) => teacher.teacher).join(", ") : "ELD assessor"}</h3>
          {result.message ? <p>{result.message}</p> : null}
          {result.warning ? <p className="warn">{result.warning}</p> : null}
          {result.slots.length ? (
            <ul>
              {result.slots.map((slot) => (
                <li key={`${slot.date}-${slot.slotStart}-${slot.teacher}`}>{slot.heading} · {slot.slotStart}–{slot.slotEnd} · {slot.teacher} · block {slot.blockStart}–{slot.blockEnd}</li>
              ))}
            </ul>
          ) : null}
          <p className="lede">{result.title}</p>
          <button className="btn" type="button" onClick={() => void copyTitle()}>Copy</button>
          {copied ? <p className="lede">{copied}</p> : null}
        </div>
      ) : null}
      {grouped.upcoming.length ? <h3 className="tour-section font-heading">Upcoming</h3> : <p className="lede">No upcoming assessments.</p>}
      {grouped.upcoming.map((day) => (
        <div key={day.heading}>
          <h3 className="font-heading">{day.heading}</h3>
          <AssessmentCards items={day.items} />
        </div>
      ))}
      {grouped.past.length ? <h3 className="tour-section font-heading">Past</h3> : null}
      {grouped.past.map((day) => (
        <div key={day.heading}>
          <h3 className="font-heading">{day.heading}</h3>
          <AssessmentCards items={day.items} />
        </div>
      ))}
      {grouped.postponed.length ? <h3 className="tour-section font-heading">Postponed</h3> : null}
      {grouped.postponed.length ? <AssessmentCards items={grouped.postponed} /> : null}
      <p className="lede">{assessmentCountLabel(schedule.assessments.length)} on the Assessments tab.</p>
    </section>
  );
}

export function NewStudentsPanel({ schedule, syncing, onSync }: { schedule: ScheduleBundle; syncing: boolean; onSync: () => void }) {
  const [year, setYear] = useState(currentNewStudentYear);
  const [grade, setGrade] = useState("all");
  const rows = schedule.newStudents[year] ?? null;
  const list = rows ?? [];
  const summary = newStudentSummary(list);
  const grades = gradeButtonsForRows(list.map((row) => ({ id: row.studentId || row.name, cells: { Grade: row.grade }, detail: [], badges: [] })));
  const visible = useMemo(() => (grade === "all" ? list : list.filter((row) => canonicalGrade(row.grade) === canonicalGrade(grade) || row.grade === grade)), [list, grade]);
  const columns = ["Student ID", "Name", "Nickname", "Grade", "Start date", "Start note", "Class", "Letter sent", "Payment status", "Scholarship type", "ELD/LS flag", "Status", "Notes", "Source year tab"] as const;
  const cell = (row: NewStudent, column: (typeof columns)[number]) => {
    const map: Record<(typeof columns)[number], string> = {
      "Student ID": row.studentId,
      Name: row.name,
      Nickname: row.nickname,
      Grade: row.grade,
      "Start date": row.startDate,
      "Start note": row.startNote,
      Class: row.className,
      "Letter sent": row.letterSent,
      "Payment status": row.paymentStatus,
      "Scholarship type": row.scholarshipType,
      "ELD/LS flag": row.eldFlag,
      Status: row.status,
      Notes: row.notes,
      "Source year tab": row.sourceTab,
    };
    return map[column];
  };
  return (
    <section>
      <div className="page-head">
        <div>
          <h2>New Students {year}</h2>
          <p className="lede">Canceled and Deferred rows stay on the list and are shown in grey.</p>
        </div>
        <SyncTabButton busy={syncing} onSync={onSync} />
      </div>
      <SchoolYearBar years={newStudentYears.map((item) => item.year)} year={year} onChange={(next) => { setYear(next); setGrade("all"); }} />
      {rows == null || rows.length === 0 ? <div className="card" role="status"><h3>{missingNewStudentsMessage(year)}</h3></div> : null}
      {rows && rows.length ? (
        <div className="chip-row">
          <span className="chip">Active {summary.active}</span>
          {summary.payments.map((item) => <span key={item.label} className="chip">{item.label} {item.count}</span>)}
          <span className="chip">Letters sent {summary.lettersSent}</span>
          <span className="chip">Letters signed {summary.lettersSigned}</span>
          <span className="chip">Class assigned {summary.classAssigned}</span>
          <span className="chip">ID assigned {summary.idAssigned}</span>
        </div>
      ) : null}
      {rows && rows.length ? (
        <div className="grade-bar" role="toolbar" aria-label="Grade levels">
          <button type="button" className={grade === "all" ? "btn primary" : "btn"} onClick={() => setGrade("all")}>All</button>
          {(grades.length ? grades : studentGradeLevels.filter((level) => list.some((row) => canonicalGrade(row.grade) === level))).map((level) => (
            <button key={level} type="button" className={grade === level ? "btn primary" : "btn"} onClick={() => setGrade(level)}>
              {level} ({filterStudentsByGrade(list.map((row) => ({ id: row.name, cells: { Grade: row.grade }, detail: [], badges: [] })), level).length})
            </button>
          ))}
        </div>
      ) : null}
      {rows && rows.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
            <tbody>
              {visible.map((row) => (
                <tr key={`${row.studentId}-${row.name}-${row.grade}`} className={newStudentIsInactive(row) ? "row-muted" : undefined}>
                  {columns.map((column) => <td key={column}>{cell(row, column) || "—"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <p className="lede">Showing {visible.length} of {list.length}</p>
    </section>
  );
}
