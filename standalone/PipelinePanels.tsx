import { useMemo, useState } from "react";
import type { OfficeRow } from "@/lib/office/types";
import { syncControlLabel } from "@/lib/standalone/tabs";
import {
  admittedKpis,
  applicantBuckets,
  enrollmentYearOptions,
  filterByEnrollmentYear,
  missingItemChips,
  normalizeBucket,
  paymentLabel,
  sortApplicants,
  startDatePassed,
  type EnrollmentYearOption,
} from "@/lib/standalone/pipeline";

function SyncTabButton({ busy, onSync }: { busy: boolean; onSync: () => void }) {
  return (
    <button className="btn primary" type="button" data-sync="tab" disabled={busy} title="Runs the OA tours, calendar, and master sheet sync through the bot." onClick={onSync}>
      {busy ? "Requesting…" : syncControlLabel}
    </button>
  );
}

function YearButtons({ year, onChange }: { year: EnrollmentYearOption; onChange: (year: EnrollmentYearOption) => void }) {
  return (
    <div className="grade-bar" role="toolbar" aria-label="Enrollment year">
      {enrollmentYearOptions.map((option) => (
        <button key={option} type="button" className={year === option ? "btn primary" : "btn"} onClick={() => onChange(option)}>{option}</button>
      ))}
      <button type="button" className={year === "all" ? "btn primary" : "btn"} onClick={() => onChange("all")}>All</button>
    </div>
  );
}

export function AdmittedPanel({ rows, today, syncing, onSync }: { rows: OfficeRow[]; today: string; syncing: boolean; onSync: () => void }) {
  const [year, setYear] = useState<EnrollmentYearOption>("2026-27");
  const visible = useMemo(() => filterByEnrollmentYear(rows, year), [rows, year]);
  const kpis = admittedKpis(visible, today);
  return (
    <section>
      <div className="page-head">
        <div>
          <h2>Admitted</h2>
          <p className="lede">Still-admitted offers. A start date in red has already passed.</p>
        </div>
        <SyncTabButton busy={syncing} onSync={onSync} />
      </div>
      <YearButtons year={year} onChange={setYear} />
      <div className="chip-row">
        <span className="chip">Admitted {kpis.total}</span>
        <span className="chip">Starting this semester {kpis.starting}</span>
        <span className="chip">Start date passed {kpis.passed}</span>
        <span className="chip">Awaiting Finance {kpis.awaitingFinance}</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>{["Name", "Nickname", "Student ID", "Grade", "Start date", "Payment status", "Invoice", "Notes"].map((header) => <th key={header}>{header}</th>)}</tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id}>
                <td><strong>{row.cells.Name || "—"}</strong></td>
                <td>{row.cells.Nickname || "—"}</td>
                <td>{row.cells["Student ID"] || "—"}</td>
                <td>{row.cells.Grade || "—"}</td>
                <td className={startDatePassed(row, today) ? "start-passed" : undefined}>{row.cells["Start date"] || "—"}</td>
                <td>{paymentLabel(row)}</td>
                <td>{row.cells.Invoice ? <span className="chip">{row.cells.Invoice}</span> : "—"}</td>
                <td>{row.cells.Notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="lede">{visible.length} admitted</p>
    </section>
  );
}

export function ApplicantsPanel({ rows, syncing, onSync }: { rows: OfficeRow[]; syncing: boolean; onSync: () => void }) {
  const [year, setYear] = useState<EnrollmentYearOption>("2026-27");
  const [bucket, setBucket] = useState<string>("all");
  const byYear = useMemo(() => filterByEnrollmentYear(rows, year), [rows, year]);
  const counts = useMemo(() => {
    const tally = new Map<string, number>();
    for (const row of byYear) {
      const label = normalizeBucket(row.cells.Bucket || "") || "Other";
      tally.set(label, (tally.get(label) ?? 0) + 1);
    }
    return tally;
  }, [byYear]);
  const visible = useMemo(() => {
    const filtered = bucket === "all" ? byYear : byYear.filter((row) => normalizeBucket(row.cells.Bucket || "") === bucket);
    return sortApplicants(filtered);
  }, [byYear, bucket]);
  return (
    <section>
      <div className="page-head">
        <div>
          <h2>Applicants</h2>
          <p className="lede">Sorted by bucket, then by the latest update.</p>
        </div>
        <SyncTabButton busy={syncing} onSync={onSync} />
      </div>
      <YearButtons year={year} onChange={setYear} />
      <div className="grade-bar" role="toolbar" aria-label="Applicant buckets">
        <button type="button" className={bucket === "all" ? "btn primary" : "btn"} onClick={() => setBucket("all")}>All ({byYear.length})</button>
        {applicantBuckets.map((item) => (
          <button key={item} type="button" className={bucket === item ? "btn primary" : "btn"} onClick={() => setBucket(item)}>{item} ({counts.get(item) ?? 0})</button>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>{["Name", "Grade", "Bucket", "Missing items", "Assessment date", "Reviewed by", "Submitted date", "Last updated"].map((header) => <th key={header}>{header}</th>)}</tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const label = normalizeBucket(row.cells.Bucket || "");
              return (
                <tr key={row.id}>
                  <td><strong>{row.cells.Name || "—"}</strong></td>
                  <td>{row.cells.Grade || "—"}</td>
                  <td>{label ? <span className="chip">{label}</span> : "—"}</td>
                  <td>{missingItemChips(row.cells["Missing items"] || "").map((item) => <span key={item} className="chip">{item}</span>)}{row.cells["Missing items"]?.trim() ? "" : "—"}</td>
                  <td>{row.cells["Assessment date"] || "—"}</td>
                  <td>{row.cells["Reviewed by"]?.trim() || "—"}</td>
                  <td>{row.cells["Submitted date"] || "—"}</td>
                  <td>{row.cells["Last updated"] || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="lede">{visible.length} applicants</p>
    </section>
  );
}
