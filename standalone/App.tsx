import { useMemo, useRef, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { canonicalGrade, filterStudentsByGrade, studentGradeLevels, type StudentGradeLevel } from "@/lib/standalone/grades";
import { dashboardTabs, syncControlLabel } from "@/lib/standalone/tabs";
import { walkInFormFields } from "@/tabs/tours/walkinForm.config";
import { fictionalSnapshot } from "@/lib/office/sample";
import { rowInYear, yearOptions } from "@/lib/office/year";
import type { OfficeChart, OfficeRow, OfficeSnapshot, OfficeTabId } from "@/lib/office/types";
import {
  calendarWriteQuery,
  noShowPatch,
  notesPatch,
  sampleTours,
  snapshotFromSheets,
  tourRowsFromSheets,
  walkInEventBody,
  type LocalTour,
} from "@/lib/standalone/data";
import { buildWalkInTitle } from "@/lib/title";
import { tourInterval } from "@/lib/time";
import {
  defaultSyncSchedule,
  describeSyncSchedule,
  latestSyncAt,
  normalizeWebhookUrl,
  parseSyncSchedule,
  scheduleStorageKey,
  syncLogAdvanced,
  syncWebhookBody,
  webhookStorageKey,
  type SyncSchedule,
} from "@/lib/standalone/sync-webhook";
import { assertSchoolAccount, calendarWrite, fileProtocolBlocked, loadMasterSheet, readConfig, requestSchoolToken } from "./google";

type Source = "sample" | "file" | "sheet";

export function App() {
  const brand = window.__BRAND ?? { white: "", navy: "" };
  const config = readConfig();
  const [tab, setTab] = useState("tours");
  const [source, setSource] = useState<Source>("sample");
  const [snapshot, setSnapshot] = useState<OfficeSnapshot>(() => fictionalSnapshot());
  const [tours, setTours] = useState<LocalTour[]>(() => sampleTours());
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedTour, setSelectedTour] = useState<LocalTour | null>(null);
  const [selectedRow, setSelectedRow] = useState<OfficeRow | null>(null);
  const [walkIn, setWalkIn] = useState(false);
  const [chart, setChart] = useState<OfficeChart | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [webhookDraft, setWebhookDraft] = useState(() => localStorage.getItem(webhookStorageKey()) ?? "");
  const [schedule, setSchedule] = useState<SyncSchedule>(() => parseSyncSchedule(localStorage.getItem(scheduleStorageKey())));
  const [syncState, setSyncState] = useState<"idle" | "loading" | "success" | "failure">("idle");

  async function signIn() {
    setError("");
    if (fileProtocolBlocked()) {
      setError("Google sign-in cannot run from a file:// page. Use Load data file, or open this file from http://localhost. See STANDALONE.md.");
      return;
    }
    if (!config.googleClientId || config.googleClientId.includes("YOUR_")) {
      setError("Paste the public OAuth client ID into the config block at the top of this file.");
      return;
    }
    if (!config.masterSheetId) {
      setError("Paste the master spreadsheet ID into the config block.");
      return;
    }
    try {
      const access = await requestSchoolToken(config);
      const account = await assertSchoolAccount(access, config.allowedDomain);
      const loaded = await loadMasterSheet(access, config.masterSheetId);
      if (!loaded.snapshot && loaded.tours.length === 0) throw new Error("The master sheet has no dashboard tabs yet.");
      if (loaded.snapshot) setSnapshot(loaded.snapshot);
      if (loaded.tours.length) setTours(loaded.tours);
      setToken(access);
      setEmail(account);
      setSource("sheet");
      setMessage(`Signed in as ${account}. Data is from the master sheet.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign-in failed.");
    }
  }

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Record<string, unknown>;
        if (parsed.tabs && typeof parsed.tabs === "object") {
          setSnapshot(parsed as unknown as OfficeSnapshot);
        } else if (parsed.snapshot && typeof parsed.snapshot === "object") {
          setSnapshot(parsed.snapshot as OfficeSnapshot);
          if (Array.isArray(parsed.tours)) setTours(parsed.tours as LocalTour[]);
        } else if (parsed.sheets && typeof parsed.sheets === "object") {
          const sheets = parsed.sheets as Record<string, string[][]>;
          const next = snapshotFromSheets(sheets);
          if (next) setSnapshot(next);
          const tourRows = tourRowsFromSheets(sheets);
          if (tourRows.length) setTours(tourRows);
        } else {
          throw new Error("Unrecognized data file.");
        }
        setSource("file");
        setMessage(`Loaded ${file.name}.`);
        setError("");
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not read that file.");
      }
    };
    reader.readAsText(file);
  }

  async function createWalkIn(values: Record<string, string>) {
    const summary = buildWalkInTitle({
      firstName: values["student.first_name"],
      lastName: values["student.last_name"],
      preferredName: values["student.custom_fields.thai_nickname"],
      grade: values["student.grade"],
    });
    const interval = tourInterval(values.date, values.time, 120);
    const body = walkInEventBody({
      summary,
      description: `Source: Walk-in\n${values.note || ""}`,
      start: interval.start,
      end: interval.end,
    });
    let eventId = "";
    if (token) {
      const created = await calendarWrite(token, config.calendarId, "/events", "POST", body);
      eventId = created.id ?? "";
    }
    if (calendarWriteQuery() !== "sendUpdates=none") throw new Error("sendUpdates");
    const tour: LocalTour = {
      id: `walk-${Date.now()}`,
      date: values.date,
      time: values.time,
      students: `${values["student.first_name"]} ${values["student.last_name"]}`,
      grade: values["student.grade"],
      host: values.host || "",
      status: "Walk-in",
      attendance: "",
      calendarEventId: eventId,
      title: summary,
      note: values.note || "",
    };
    setTours((current) => [tour, ...current]);
    setWalkIn(false);
    setMessage(token ? "Walk-in event created (sendUpdates=none)." : "Walk-in saved in this file. Sign in to create the calendar event.");
  }

  function saveFile() {
    const blob = new Blob([JSON.stringify({ snapshot, tours }, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "advancement-office-data.json";
    link.click();
  }

  async function reloadSheet(): Promise<OfficeSnapshot | null> {
    if (!token || !config.masterSheetId) return null;
    const loaded = await loadMasterSheet(token, config.masterSheetId);
    if (loaded.snapshot) setSnapshot(loaded.snapshot);
    if (loaded.tours.length) setTours(loaded.tours);
    setSource("sheet");
    return loaded.snapshot;
  }

  function saveWebhook() {
    const url = normalizeWebhookUrl(webhookDraft);
    if (!url) {
      setError("Paste a full https webhook URL from the Grok Bot routine panel.");
      return;
    }
    localStorage.setItem(webhookStorageKey(), url);
    localStorage.setItem(scheduleStorageKey(), JSON.stringify(schedule));
    setWebhookDraft(url);
    setSettingsOpen(false);
    setError("");
    setMessage(`Saved in this browser. ${describeSyncSchedule(schedule)}. Sync Now sends this to the bot.`);
  }

  async function syncNow() {
    const url = normalizeWebhookUrl(localStorage.getItem(webhookStorageKey()) ?? "");
    if (!url) {
      setSettingsOpen(true);
      setSyncState("idle");
      setError("Paste the OA tours sync webhook URL, then click Sync Now again.");
      return;
    }
    setSyncState("loading");
    setError("");
    setMessage("Requesting the OA tours, calendar, and master sheet sync. The bot runs it. This page does not call OpenApply.");
    const before = latestSyncAt(snapshot.syncLog);
    try {
      const savedSchedule = parseSyncSchedule(localStorage.getItem(scheduleStorageKey()));
      const response = await fetch(url, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(syncWebhookBody(savedSchedule)),
      });
      if (!response.ok) throw new Error(`The webhook returned ${response.status}.`);
      setSyncState("success");
      setMessage("Sync requested. Waiting for a new Sync Log row in the master sheet.");
      if (!token) return;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 8000));
        const next = await reloadSheet();
        if (next && syncLogAdvanced(before, latestSyncAt(next.syncLog))) {
          setMessage("The master sheet has a new Sync Log row. This view is updated.");
          return;
        }
      }
      setMessage("Sync was requested. The sheet does not have a new Sync Log row yet. The bot is still writing. Sign in again in a minute if the tours look unchanged.");
    } catch (reason) {
      setSyncState("failure");
      setError(reason instanceof Error ? reason.message : "The webhook call failed. Check the URL and that the routine allows this page.");
    }
  }

  async function markNoShow(tour: LocalTour) {
    const summary = noShowPatch(tour.title).summary;
    if (token && tour.calendarEventId) {
      await calendarWrite(token, config.calendarId, `/events/${encodeURIComponent(tour.calendarEventId)}`, "PATCH", noShowPatch(tour.title));
    }
    setTours((current) => current.map((item) => (item.id === tour.id ? { ...item, attendance: "No show", title: summary } : item)));
    setMessage(token && tour.calendarEventId ? "No-show tag written to Calendar (sendUpdates=none)." : "No-show tag saved in this file. Sign in to update Calendar.");
  }

  return (
    <div>
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand">
            {brand.white ? <img src={brand.white} alt="RIS Ratchapruek" /> : null}
            <div>
              <h1>Advancement Office</h1>
              <p className="subtle">Admissions, Registration, and Alumni Relations · Ruamrudee International School Ratchapruek</p>
            </div>
          </div>
          <div className="header-actions">
            {email ? <span className="badge">{email}</span> : null}
            {email ? (
              <button
                className="btn primary"
                type="button"
                disabled={syncState === "loading"}
                title="Runs the OA tours, calendar, and master sheet sync, the same job as 05:55 Asia/Bangkok."
                onClick={() => void syncNow()}
              >
                {syncState === "loading" ? "Requesting…" : "Sync Now"}
              </button>
            ) : null}
            <button className="btn" type="button" aria-label="Sync webhook settings" onClick={() => setSettingsOpen(true)}>
              Settings
            </button>
            <button className="btn" type="button" onClick={signIn}>Sign in with Google</button>
            <label className="btn">
              Load data file
              <input hidden type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; if (file) onFile(file); }} />
            </label>
            <button className="btn" type="button" onClick={saveFile}>Save data file</button>
          </div>
        </div>
      </header>
      <nav className="tabs" aria-label="Dashboard sections">
        {dashboardTabs.map((item) => (
          <button key={item.id} type="button" className={tab === item.id ? "active" : ""} disabled={!item.enabled} onClick={() => setTab(item.id)}>
            {item.label}{item.enabled ? "" : " Soon"}
          </button>
        ))}
      </nav>
      <main className="page">
        {message ? <p className="notice">{message}</p> : null}
        {error ? <p className="warn">{error}</p> : null}
        {email ? <p className="lede">Sync Now asks the bot to run the OA tours, calendar, and master sheet sync now. Saved schedule: {describeSyncSchedule(schedule)}. Asia/Bangkok. The morning job still belongs to the Grok Bot routine.</p> : null}
        {source === "sample" ? <p className="lede">Sample data is loaded. Sign in to read the master sheet, or use Load data file.</p> : null}
        {tab === "tours" ? (
          <ToursPanel
            tours={tours}
            logo={brand.navy}
            syncing={syncState === "loading"}
            onSync={() => void syncNow()}
            onNoShow={(tour) => void markNoShow(tour).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Calendar update failed."))}
            onOpen={setSelectedTour}
            onWalkIn={() => setWalkIn(true)}
            onChart={() => setChart({ id: "attendance", title: "Tour attendance", points: attendancePoints(tours) })}
          />
        ) : dashboardTabs.find((item) => item.id === tab)?.enabled ? (
          <OfficePanel
            tab={tab as OfficeTabId}
            snapshot={snapshot}
            syncing={syncState === "loading"}
            onSync={() => void syncNow()}
            onOpen={setSelectedRow}
            onChart={setChart}
          />
        ) : (
          <section className="card">
            <div className="page-head">
              <h3 className="font-heading">Coming soon</h3>
              <SyncTabButton busy={syncState === "loading"} onSync={() => void syncNow()} />
            </div>
            <p>This section is not built yet.</p>
          </section>
        )}
      </main>
      {selectedTour ? <NotesSlide title={selectedTour.students} detail={[["Date", selectedTour.date], ["Time", selectedTour.time], ["Host", selectedTour.host], ["Attendance", selectedTour.attendance]]} storageKey={`risr.tourNotes.${selectedTour.id}`} onClose={() => setSelectedTour(null)} onSave={async (text) => {
        if (token && selectedTour.calendarEventId) await calendarWrite(token, config.calendarId, `/events/${encodeURIComponent(selectedTour.calendarEventId)}`, "PATCH", notesPatch(text));
        setMessage(token && selectedTour.calendarEventId ? "Notes written to Calendar (sendUpdates=none)." : "Notes saved on this computer.");
      }} /> : null}
      {selectedRow ? <NotesSlide title={selectedRow.cells.Name || "Record"} detail={selectedRow.detail.map((item) => [item.label, item.value])} storageKey={`risr.officeNotes.${selectedRow.id}`} onClose={() => setSelectedRow(null)} /> : null}
      {walkIn ? <WalkInDialog onClose={() => setWalkIn(false)} onCreate={createWalkIn} /> : null}
      {chart ? <ChartWindow chart={chart} logo={brand.navy} onClose={() => setChart(null)} /> : null}
      {settingsOpen ? (
        <div className="modal-back" onClick={() => setSettingsOpen(false)}>
          <form
            className="modal"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              saveWebhook();
            }}
          >
            <header>
              <h3 className="font-heading">Sync webhook</h3>
              <button className="btn" type="button" onClick={() => setSettingsOpen(false)}>Close</button>
            </header>
            <div className="body">
              <p className="lede">Paste the URL from the Grok Bot routine “OA tours sync (manual)”. The date, time, and interval are saved in this browser and sent with Sync Now. The bot still runs the OpenApply job. This page does not.</p>
              <label>
                Webhook URL
                <input value={webhookDraft} onChange={(event) => setWebhookDraft(event.target.value)} placeholder="https://" autoComplete="off" />
              </label>
              <label>
                Date (optional one-off)
                <input type="date" value={schedule.date} onChange={(event) => setSchedule({ ...schedule, date: event.target.value })} />
              </label>
              <label>
                Time (Asia/Bangkok)
                <input type="time" value={schedule.time} onChange={(event) => setSchedule({ ...schedule, time: event.target.value || defaultSyncSchedule().time })} />
              </label>
              <label>
                Interval
                <select value={schedule.interval} onChange={(event) => setSchedule({ ...schedule, interval: event.target.value as SyncSchedule["interval"] })}>
                  <option value="weekdays">Weekdays at this time</option>
                  <option value="daily">Daily</option>
                  <option value="hourly">Every N hours</option>
                  <option value="manual">Manual only</option>
                </select>
              </label>
              {schedule.interval === "hourly" ? (
                <label>
                  Every N hours
                  <input type="number" min={1} max={24} value={schedule.everyHours} onChange={(event) => setSchedule({ ...schedule, everyHours: Number(event.target.value) })} />
                </label>
              ) : null}
              <p className="lede">{describeSyncSchedule(schedule)}. Changing this here does not edit the Grok Bot clock until Sync Now sends it.</p>
              <button className="btn primary" type="submit">Save</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function attendancePoints(tours: LocalTour[]) {
  const counts = new Map<string, number>();
  for (const tour of tours) {
    const label = tour.attendance || "Unmarked";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, value]) => ({ label, value }));
}

function SyncTabButton({ busy, onSync }: { busy: boolean; onSync: () => void }) {
  return (
    <button className="btn primary" type="button" data-sync="tab" disabled={busy} title="Runs the OA tours, calendar, and master sheet sync through the bot." onClick={onSync}>
      {busy ? "Requesting…" : syncControlLabel}
    </button>
  );
}

function ToursPanel({ tours, logo, syncing, onSync, onNoShow, onOpen, onWalkIn, onChart }: { tours: LocalTour[]; logo: string; syncing: boolean; onSync: () => void; onNoShow: (tour: LocalTour) => void; onOpen: (tour: LocalTour) => void; onWalkIn: () => void; onChart: () => void }) {
  const [query, setQuery] = useState("");
  const visible = tours.filter((tour) => `${tour.students} ${tour.host} ${tour.date}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <section>
      <div className="page-head">
        <div>
          <h2>School Tours/Visits</h2>
          <p className="lede">Times are Asia/Bangkok. No-show and walk-in writes use the signed-in account on the admissions calendar, with sendUpdates=none.</p>
        </div>
        <div className="header-actions">
          <SyncTabButton busy={syncing} onSync={onSync} />
          <button className="btn" type="button" onClick={onChart}>Attendance chart</button>
          <button className="btn primary" type="button" onClick={onWalkIn}>New Walk-in Tour</button>
        </div>
      </div>
      <div className="toolbar">
        <label>Search <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or host" /></label>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr>{["Date", "Time", "Students", "Grade", "Host", "Status", "Attendance", ""].map((header) => <th key={header}>{header}</th>)}</tr></thead>
          <tbody>
            {visible.map((tour) => (
              <tr key={tour.id} className="clickable" onClick={() => onOpen(tour)}>
                <td>{tour.date}</td><td>{tour.time}</td><td><strong>{tour.students}</strong></td><td>{tour.grade}</td><td>{tour.host}</td><td>{tour.status}</td><td>{tour.attendance || "—"}</td>
                <td><button className="btn" type="button" onClick={(event) => { event.stopPropagation(); onNoShow(tour); }}>No show</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {logo ? <p className="lede">Export headers use the navy logo.</p> : null}
    </section>
  );
}

function OfficePanel({ tab, snapshot, syncing, onSync, onOpen, onChart }: { tab: OfficeTabId; snapshot: OfficeSnapshot; syncing: boolean; onSync: () => void; onOpen: (row: OfficeRow) => void; onChart: (chart: OfficeChart) => void }) {
  const payload = snapshot.tabs[tab];
  const [year, setYear] = useState("2026-27");
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState<"all" | StudentGradeLevel>("all");
  const [sort, setSort] = useState<{ column: string; dir: "asc" | "desc" } | null>(null);
  const rows = useMemo(() => {
    const byYear = payload.rows.filter((row) => rowInYear(row, year, tab)).filter((row) => Object.values(row.cells).join(" ").toLowerCase().includes(query.trim().toLowerCase()));
    const filtered = tab === "student-list" ? filterStudentsByGrade(byYear, grade) : byYear;
    if (!sort) return filtered;
    return [...filtered].sort((a, b) => {
      const compared = (a.cells[sort.column] ?? "").localeCompare(b.cells[sort.column] ?? "", undefined, { numeric: true });
      return sort.dir === "asc" ? compared : -compared;
    });
  }, [payload.rows, year, query, sort, tab, grade]);
  return (
    <section>
      <div className="page-head">
        <div>
          <h2>{payload.title}</h2>
          {tab === "student-list" ? <p className="lede">Student ID is Weena’s ID No. from STUDENT LIST SY2026-2027. OpenApply’s Student ID is not the ID of record. OA id is the matched OpenApply record, when there is one. Sync refreshes Weena and OpenApply through the bot, then this page reads the master sheet.</p> : null}
          {payload.note ? <p className="lede">{payload.note}</p> : null}
        </div>
        <SyncTabButton busy={syncing} onSync={onSync} />
      </div>
      {tab === "student-list" ? (
        <div className="grade-bar" role="toolbar" aria-label="Grade levels">
          <button type="button" className={grade === "all" ? "btn primary" : "btn"} onClick={() => setGrade("all")}>All</button>
          {studentGradeLevels.map((level) => (
            <button key={level} type="button" className={grade === level ? "btn primary" : "btn"} onClick={() => setGrade(level)}>
              {level} ({payload.rows.filter((row) => canonicalGrade(row.cells.Grade || "") === level).length})
            </button>
          ))}
        </div>
      ) : null}
      <div className="kpis">
        {payload.kpis.map((kpi) => (
          <button key={kpi.id} className="kpi" type="button" onClick={() => { const match = payload.charts.find((chart) => chart.id === kpi.chartId); if (match) onChart(match); }}>
            <span>{kpi.label}</span><strong>{kpi.value}</strong>
          </button>
        ))}
      </div>
      <div className="toolbar">
        <label>Year <select value={year} onChange={(event) => setYear(event.target.value)}>{yearOptions.map((option) => <option key={option} value={option}>{option === "all" ? "All years" : option}</option>)}</select></label>
        <label>Search <input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      </div>
      {payload.reconciliation ? <div className="card"><h3>Reconciliation</h3><p>{payload.reconciliation.map((item) => `${item.label}: ${item.count}`).join(" · ")}</p>{payload.mismatches?.length ? <ul>{payload.mismatches.map((item) => <li key={`${item.name}-${item.issue}`}>{item.name}: {item.issue}</li>)}</ul> : null}</div> : null}
      {payload.gaps.length ? <div className="card"><h3>Data quality</h3><ul>{payload.gaps.map((gap) => <li key={gap.label}><strong>{gap.label}.</strong> {gap.detail}</li>)}</ul></div> : null}
      <div className="table-wrap">
        <table>
          <thead><tr>{payload.columns.map((column) => <th key={column}><button type="button" onClick={() => setSort((current) => ({ column, dir: current?.column === column && current.dir === "asc" ? "desc" : "asc" }))}>{column}</button></th>)}</tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="clickable" onClick={() => onOpen(row)}>
                {payload.columns.map((column) => <td key={column}>{row.cells[column] || "—"}{column === "Name" ? row.badges.map((badge) => <span key={badge} className="badge">{badge}</span>) : null}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="lede">{rows.length} rows</p>
    </section>
  );
}

function NotesSlide({ title, detail, storageKey, onClose, onSave }: { title: string; detail: [string, string][]; storageKey: string; onClose: () => void; onSave?: (text: string) => Promise<void> }) {
  const [comment, setComment] = useState(() => localStorage.getItem(storageKey) ?? "");
  return (
    <aside className="slide">
      <header><h3 className="font-heading">{title}</h3><button className="btn" type="button" onClick={onClose}>Close</button></header>
      <div className="body">
        <p className="lede">Notes</p>
        <dl>{detail.filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <label>Comment<textarea rows={5} value={comment} onChange={(event) => { setComment(event.target.value); localStorage.setItem(storageKey, event.target.value); }} /></label>
        {onSave ? <button className="btn primary" type="button" onClick={() => void onSave(comment)}>Save to calendar</button> : null}
      </div>
    </aside>
  );
}

function WalkInDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (values: Record<string, string>) => Promise<void> }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const sections = ["Tour", "Child", "Parent"] as const;
  return (
    <div className="modal-back" onClick={onClose}>
      <form className="modal" onClick={(event) => event.stopPropagation()} onSubmit={(event) => {
        event.preventDefault();
        const missing = walkInFormFields.find((field) => field.required && !values[field.name]?.trim());
        if (missing) { setError(`${missing.label} is required.`); return; }
        void onCreate(values).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not book the walk-in."));
      }}>
        <header><h3 className="font-heading">New walk-in tour</h3><button className="btn" type="button" onClick={onClose}>Close</button></header>
        <div className="body">
          <p className="lede">Slots are 8:00 or 10:00 and last two hours. The calendar title is Walk-in - First (Nickname) Last (Grade). No Google Meet link is added.</p>
          {error ? <p className="warn">{error}</p> : null}
          {sections.map((section) => (
            <fieldset key={section}><legend className="font-heading">{section}</legend>
              <div className="grid-2">
                {walkInFormFields.filter((field) => field.section === section).map((field) => (
                  <label key={field.name}>{field.label}{field.required ? " *" : ""}
                    {field.type === "select" && field.options ? (
                      <select value={values[field.name] ?? ""} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}><option value="">Select</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select>
                    ) : field.type === "textarea" ? (
                      <textarea rows={3} value={values[field.name] ?? ""} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} />
                    ) : (
                      <input type={field.type === "multiselect" ? "text" : field.type} value={values[field.name] ?? ""} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} />
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <button className="btn primary" type="submit">Book walk-in</button>
        </div>
      </form>
    </div>
  );
}

function ChartWindow({ chart, logo, onClose }: { chart: OfficeChart; logo: string; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  async function exportChart(kind: "png" | "pdf") {
    if (!ref.current) return;
    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(ref.current, { backgroundColor: "#ffffff" });
    if (kind === "png") {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${chart.id}.png`;
      link.click();
      return;
    }
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    pdf.addImage(dataUrl, "PNG", 24, 24, 540, 300);
    pdf.save(`${chart.id}.pdf`);
  }
  return (
    <section className="float" ref={ref}>
      <header>
        <div>{logo ? <img className="export-logo" src={logo} alt="" /> : null}<h3 className="font-heading">{chart.title}</h3><p className="lede">Advancement Office</p></div>
        <div className="header-actions">
          <button className="btn" type="button" onClick={() => void exportChart("png")}>PNG</button>
          <button className="btn" type="button" onClick={() => void exportChart("pdf")}>PDF</button>
          <button className="btn primary" type="button" onClick={onClose}>Close</button>
        </div>
      </header>
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart.points}><XAxis dataKey="label" interval={0} angle={-25} height={70} textAnchor="end" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill="#23355D" /></BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
