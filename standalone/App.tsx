import { useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { filterStudentsByGrade } from "@/lib/standalone/grades";
import { dashboardTabs, syncControlLabel } from "@/lib/standalone/tabs";
import { walkInFormFields } from "@/tabs/tours/walkinForm.config";
import { defaultYearForTab, rowInYear, yearOptions } from "@/lib/office/year";
import type { OfficeChart, OfficeRow, OfficeSnapshot, OfficeTabId } from "@/lib/office/types";
import {
  applyMasterLoad,
  calendarWriteQuery,
  demoOfficeSession,
  demoStudentListBanner,
  formatLoadedAt,
  initialOfficeSession,
  noShowPatch,
  notesPatch,
  presentStudentList,
  readMasterSheets,
  signInStudentListMessage,
  studentListSourceLabel,
  walkInEventBody,
  type DatasetOrigin,
  type LocalTour,
  type OfficeSession,
} from "@/lib/standalone/data";
import { groupToursByDay, tourCountLabel, type TourDayGroup } from "@/lib/standalone/tour-groups";
import { buildWalkInTitle } from "@/lib/title";
import { todayIct, tourInterval } from "@/lib/time";
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
import { gradeButtonsForRows } from "@/lib/standalone/student-years";
import { currentSchoolYear, missingYearMessage, yearTabSection, type SchoolYear, type YearArchives } from "@/lib/standalone/school-years";
import { SchoolYearBar } from "./SchoolYearBar";
import { alumniClasses, alumniColumnLabel, defaultAlumniClassYear, filterAlumniByClass, missingAlumniClassMessage, type AlumniClassYear } from "@/lib/standalone/alumni-classes";
import { assertSchoolAccount, calendarWrite, fileProtocolBlocked, loadMasterSheet, readConfig, requestSchoolToken } from "./google";

export function App() {
  const brand = window.__BRAND ?? { white: "", navy: "" };
  const config = readConfig();
  const [tab, setTab] = useState("tours");
  const [snapshot, setSnapshot] = useState<OfficeSnapshot>(() => initialOfficeSession().snapshot);
  const [tours, setTours] = useState<LocalTour[]>([]);
  const [studentListOrigin, setStudentListOrigin] = useState<DatasetOrigin>("empty");
  const [toursOrigin, setToursOrigin] = useState<DatasetOrigin>("empty");
  const [studentListLoadedAt, setStudentListLoadedAt] = useState<string | null>(null);
  const [studentListsByYear, setStudentListsByYear] = useState(() => initialOfficeSession().studentListsByYear);
  const [yearArchives, setYearArchives] = useState<YearArchives>(() => initialOfficeSession().yearArchives);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reloadState, setReloadState] = useState<"idle" | "loading">("idle");
  const sessionRef = useRef<OfficeSession>(initialOfficeSession());
  sessionRef.current = { snapshot, tours, studentListOrigin, toursOrigin, studentListLoadedAt, studentListsByYear, yearArchives };
  const [selectedTour, setSelectedTour] = useState<LocalTour | null>(null);
  const [selectedRow, setSelectedRow] = useState<OfficeRow | null>(null);
  const [walkIn, setWalkIn] = useState(false);
  const [chart, setChart] = useState<OfficeChart | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [webhookDraft, setWebhookDraft] = useState(() => localStorage.getItem(webhookStorageKey()) ?? "");
  const [schedule, setSchedule] = useState<SyncSchedule>(() => parseSyncSchedule(localStorage.getItem(scheduleStorageKey())));
  const [syncState, setSyncState] = useState<"idle" | "loading" | "success" | "failure">("idle");

  function commitSession(session: OfficeSession) {
    setSnapshot(session.snapshot);
    setTours(session.tours);
    setStudentListOrigin(session.studentListOrigin);
    setToursOrigin(session.toursOrigin);
    setStudentListLoadedAt(session.studentListLoadedAt);
    setStudentListsByYear(session.studentListsByYear);
    setYearArchives(session.yearArchives);
  }

  function showDemo() {
    commitSession(demoOfficeSession());
    setError("");
    setMessage("Demo data is on. These names are fictional and are not the school roster.");
  }

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
      setToken(access);
      setEmail(account);
      try {
        const loaded = await loadMasterSheet(access, config.masterSheetId);
        const applied = applyMasterLoad(sessionRef.current, loaded, new Date().toISOString());
        commitSession(applied.session);
        const count = applied.session.studentListOrigin === "sheet" ? applied.session.snapshot.tabs["student-list"].rows.length : 0;
        if (applied.error) {
          setError(applied.error);
          setMessage(`Signed in as ${account}. Student List: ${count} rows.`);
        } else {
          setError("");
          setMessage(`Signed in as ${account}. Student List: ${count} rows.`);
        }
      } catch (reason) {
        const cleared = applyMasterLoad(sessionRef.current, { snapshot: null, tours: [], studentListFromSheet: false }, new Date().toISOString());
        commitSession(cleared.session);
        setError(reason instanceof Error ? reason.message : "Could not read the master sheet.");
        setMessage(`Signed in as ${account}. Student List: 0 rows.`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign-in failed.");
    }
  }

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Record<string, unknown>;
        const loadedAt = new Date().toISOString();
        if (parsed.tabs && typeof parsed.tabs === "object") {
          const next = parsed as unknown as OfficeSnapshot;
          if (next.mock) {
            commitSession(demoOfficeSession(next.generatedAt));
            setMessage(`${file.name} is demo data, not the school roster.`);
          } else {
            setSnapshot(next);
            setTours([]);
            setToursOrigin("empty");
            setStudentListOrigin("file");
            setStudentListLoadedAt(loadedAt);
            setStudentListsByYear(initialOfficeSession().studentListsByYear);
            setYearArchives(initialOfficeSession().yearArchives);
            setMessage(`Loaded ${file.name}.`);
          }
        } else if (parsed.snapshot && typeof parsed.snapshot === "object") {
          const next = parsed.snapshot as OfficeSnapshot;
          if (next.mock) {
            commitSession(demoOfficeSession(next.generatedAt));
            setMessage(`${file.name} is demo data, not the school roster.`);
          } else {
            setSnapshot(next);
            if (Array.isArray(parsed.tours)) {
              setTours(parsed.tours as LocalTour[]);
              setToursOrigin("file");
            }
            setStudentListOrigin("file");
            setStudentListLoadedAt(loadedAt);
            setMessage(`Loaded ${file.name}.`);
          }
        } else if (parsed.sheets && typeof parsed.sheets === "object") {
          const loaded = readMasterSheets(parsed.sheets as Record<string, string[][]>);
          const applied = applyMasterLoad(sessionRef.current, loaded, loadedAt, "file");
          commitSession(applied.session);
          if (applied.error) setError(applied.error);
          setMessage(applied.error ? `${file.name} did not include a Student List tab.` : `Loaded ${file.name}.`);
        } else {
          throw new Error("Unrecognized data file.");
        }
        if (!parsed.sheets) setError("");
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
    if (!token || !config.masterSheetId) {
      setError("Sign in with @risr.ac.th before reloading the master sheet.");
      return null;
    }
    const loaded = await loadMasterSheet(token, config.masterSheetId);
    const applied = applyMasterLoad(sessionRef.current, loaded, new Date().toISOString());
    commitSession(applied.session);
    if (applied.error) setError(applied.error);
    else setError("");
    return applied.session.snapshot;
  }

  async function reloadData() {
    setReloadState("loading");
    setMessage("");
    try {
      if (!token || !config.masterSheetId) {
        setError("Sign in with @risr.ac.th before reloading the master sheet.");
        return;
      }
      const loaded = await loadMasterSheet(token, config.masterSheetId);
      const applied = applyMasterLoad(sessionRef.current, loaded, new Date().toISOString());
      commitSession(applied.session);
      const count = applied.session.snapshot.tabs["student-list"].rows.length;
      if (applied.error) {
        setError(applied.error);
        setMessage(`Student List: ${applied.session.studentListOrigin === "sheet" ? count : 0} rows.`);
      } else {
        setError("");
        setMessage(`Reloaded the master sheet. Student List: ${count} rows.`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not reload the master sheet.");
    } finally {
      setReloadState("idle");
    }
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
            <button className="btn" type="button" onClick={() => void reloadData()} disabled={reloadState === "loading"}>
              {reloadState === "loading" ? "Reloading…" : "Reload data"}
            </button>
            <button className="btn" type="button" onClick={signIn}>Sign in with Google</button>
            <button className="btn" type="button" onClick={showDemo}>Demo data</button>
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
        {error ? <p className="warn" role="alert">{error}</p> : null}
        {email ? <p className="lede">Sync Now asks the bot to run the OA tours, calendar, and master sheet sync now. Saved schedule: {describeSyncSchedule(schedule)}. Asia/Bangkok. The morning job still belongs to the Grok Bot routine. Reload data reads the master sheet again and does not run that sync.</p> : null}
        {studentListOrigin === "empty" && toursOrigin === "empty" ? <p className="signin-banner" role="status">{signInStudentListMessage}</p> : null}
        {studentListOrigin === "demo" || toursOrigin === "demo" ? <p className="sample-banner" role="status">{demoStudentListBanner}</p> : null}
        {tab === "tours" ? (
          <ToursPanel
            tours={tours}
            toursOrigin={toursOrigin}
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
            studentListOrigin={studentListOrigin}
            studentListLoadedAt={studentListLoadedAt}
            yearArchives={yearArchives}
            syncing={syncState === "loading"}
            reloading={reloadState === "loading"}
            onSync={() => void syncNow()}
            onReload={() => void reloadData()}
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

function TourDayTables({ groups, onNoShow, onOpen }: { groups: TourDayGroup[]; onNoShow: (tour: LocalTour) => void; onOpen: (tour: LocalTour) => void }) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.date || "undated"} className="table-wrap">
          <table>
            <thead>
              <tr className="day-head">
                <th colSpan={7}>{group.heading}<span className="day-count">{tourCountLabel(group.tours.length)}</span></th>
              </tr>
              <tr>{["Time", "Students", "Grade", "Host", "Status", "Attendance", ""].map((header) => <th key={header}>{header}</th>)}</tr>
            </thead>
            <tbody>
              {group.tours.map((tour) => (
                <tr key={tour.id} className="clickable" onClick={() => onOpen(tour)}>
                  <td>{tour.time}</td><td><strong>{tour.students}</strong></td><td>{tour.grade}</td><td>{tour.host}</td><td>{tour.status}</td><td>{tour.attendance || "—"}</td>
                  <td><button className="btn" type="button" onClick={(event) => { event.stopPropagation(); onNoShow(tour); }}>No show</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}

function ToursPanel({ tours, toursOrigin, logo, syncing, onSync, onNoShow, onOpen, onWalkIn, onChart }: { tours: LocalTour[]; toursOrigin: DatasetOrigin; logo: string; syncing: boolean; onSync: () => void; onNoShow: (tour: LocalTour) => void; onOpen: (tour: LocalTour) => void; onWalkIn: () => void; onChart: () => void }) {
  const [query, setQuery] = useState("");
  const visible = tours.filter((tour) => `${tour.students} ${tour.host} ${tour.date}`.toLowerCase().includes(query.trim().toLowerCase()));
  const grouped = groupToursByDay(visible, todayIct());
  return (
    <section>
      <div className="page-head">
        <div>
          <h2>School Tours/Visits</h2>
          <p className="lede">Times are Asia/Bangkok. No-show and walk-in writes use the signed-in account on the admissions calendar, with sendUpdates=none.</p>
          {toursOrigin === "empty" ? <p className="signin-banner" role="status">{signInStudentListMessage}</p> : null}
          {toursOrigin === "demo" ? <p className="sample-banner" role="status">{demoStudentListBanner}</p> : null}
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
      {grouped.upcoming.length ? <h3 className="tour-section font-heading">Upcoming</h3> : null}
      <TourDayTables groups={grouped.upcoming} onNoShow={onNoShow} onOpen={onOpen} />
      {grouped.past.length ? <h3 className="tour-section font-heading">Past</h3> : null}
      <TourDayTables groups={grouped.past} onNoShow={onNoShow} onOpen={onOpen} />
      {!grouped.upcoming.length && !grouped.past.length ? <p className="lede">No Tours/Visits to show.</p> : null}
      {logo ? <p className="lede">Export headers use the navy logo.</p> : null}
    </section>
  );
}

function OfficePanel({ tab, snapshot, studentListOrigin, studentListLoadedAt, yearArchives, syncing, reloading, onSync, onReload, onOpen, onChart }: { tab: OfficeTabId; snapshot: OfficeSnapshot; studentListOrigin: DatasetOrigin; studentListLoadedAt: string | null; yearArchives: YearArchives; syncing: boolean; reloading: boolean; onSync: () => void; onReload: () => void; onOpen: (row: OfficeRow) => void; onChart: (chart: OfficeChart) => void }) {
  const raw = snapshot.tabs[tab];
  const section = yearTabSection(tab);
  const [schoolYear, setSchoolYear] = useState<SchoolYear>(currentSchoolYear);
  const [alumniClass, setAlumniClass] = useState<AlumniClassYear | "all">(defaultAlumniClassYear);
  const currentPayload = tab === "student-list" ? presentStudentList(raw, studentListOrigin) : raw;
  const archived = section && schoolYear !== currentSchoolYear ? yearArchives[section.id]?.[schoolYear] ?? null : null;
  const payload = !section
    ? raw
    : schoolYear === currentSchoolYear
      ? currentPayload
      : archived && studentListOrigin !== "empty"
        ? archived
        : { ...raw, title: `${section.currentTitle} ${schoolYear}`, rows: [], kpis: [{ id: "rows", label: "Rows", value: "0", chartId: "mix" }], charts: [], gaps: [], reconciliation: undefined, mismatches: undefined, note: missingYearMessage(section.id, schoolYear) };
  const yearMissing = Boolean(section) && studentListOrigin !== "empty" && payload.rows.length === 0 && (schoolYear !== currentSchoolYear || studentListOrigin === "sheet" || studentListOrigin === "file");
  const [year, setYear] = useState(() => defaultYearForTab(tab));
  const [query, setQuery] = useState("");
  const [grade, setGrade] = useState("all");
  const [sort, setSort] = useState<{ column: string; dir: "asc" | "desc" } | null>(null);
  useEffect(() => {
    setYear(defaultYearForTab(tab));
    setGrade("all");
    setQuery("");
    setSchoolYear(currentSchoolYear);
    setAlumniClass(defaultAlumniClassYear);
  }, [tab]);
  const rows = useMemo(() => {
    const byYear = payload.rows
      .filter((row) => (tab === "alumni" ? true : rowInYear(row, section ? "all" : year, tab)))
      .filter((row) => Object.values(row.cells).join(" ").toLowerCase().includes(query.trim().toLowerCase()));
    const byClass = tab === "alumni" ? filterAlumniByClass(byYear, alumniClass) : byYear;
    const filtered = tab === "student-list" ? filterStudentsByGrade(byClass, grade) : byClass;
    if (!sort) return filtered;
    return [...filtered].sort((a, b) => {
      const compared = (a.cells[sort.column] ?? "").localeCompare(b.cells[sort.column] ?? "", undefined, { numeric: true });
      return sort.dir === "asc" ? compared : -compared;
    });
  }, [payload.rows, year, query, sort, tab, grade, alumniClass, section]);
  return (
    <section>
      <div className="page-head">
        <div>
          <h2>{section ? `${section.currentTitle} ${schoolYear}` : payload.title}</h2>
          {tab === "student-list" && studentListOrigin === "empty" ? <p className="signin-banner" role="status">{signInStudentListMessage}</p> : null}
          {tab === "student-list" && studentListOrigin === "demo" && schoolYear === currentSchoolYear ? <p className="sample-banner" role="status">{demoStudentListBanner}</p> : null}
          {tab === "student-list" && schoolYear === currentSchoolYear && (studentListOrigin === "sheet" || studentListOrigin === "file") ? <p className="lede">Student ID is Weena’s ID No. from STUDENT LIST SY2026-2027. OpenApply’s Student ID is not the ID of record. OA id is the matched OpenApply record, when there is one. Sync refreshes Weena and OpenApply through the bot. Reload data reads the master sheet again.</p> : null}
          {section && schoolYear !== currentSchoolYear && studentListOrigin !== "empty" ? <p className="lede">This list is the master sheet tab {section.currentTitle} {schoolYear}. Past years show the sheet as stored.</p> : null}
          {section ? <p className="lede" data-student-source={studentListOrigin} data-school-year={schoolYear}>Source: {studentListSourceLabel(studentListOrigin)} · {schoolYear} · Rows: {payload.rows.length} · Last loaded: {formatLoadedAt(studentListLoadedAt)}</p> : null}
          {payload.note && tab !== "student-list" ? <p className="lede">{payload.note}</p> : null}
        </div>
        <div className="header-actions">
          {tab === "student-list" ? <button className="btn" type="button" onClick={onReload} disabled={reloading}>{reloading ? "Reloading…" : "Reload data"}</button> : null}
          <SyncTabButton busy={syncing} onSync={onSync} />
        </div>
      </div>
      {section ? <SchoolYearBar year={schoolYear} onChange={(level) => { setSchoolYear(level); setGrade("all"); }} /> : null}
      {tab === "alumni" ? (
        <div className="grade-bar" role="toolbar" aria-label="Graduating classes">
          <button type="button" className={alumniClass === "all" ? "btn primary" : "btn"} onClick={() => setAlumniClass("all")}>All</button>
          {alumniClasses.map((item) => (
            <button key={item.year} type="button" className={alumniClass === item.year ? "btn primary" : "btn"} onClick={() => setAlumniClass(item.year)}>
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
      {tab === "alumni" && alumniClass !== "all" && filterAlumniByClass(payload.rows, alumniClass).length === 0 ? <div className="card" role="status"><h3>{missingAlumniClassMessage(alumniClass)}</h3></div> : null}
      {yearMissing && section ? <div className="card" role="status"><h3>{missingYearMessage(section.id, schoolYear)}</h3></div> : null}
      {tab === "student-list" && payload.rows.length ? (
        <div className="grade-bar" role="toolbar" aria-label="Grade levels">
          <button type="button" className={grade === "all" ? "btn primary" : "btn"} onClick={() => setGrade("all")}>All</button>
          {gradeButtonsForRows(payload.rows).map((level) => (
            <button key={level} type="button" className={grade === level ? "btn primary" : "btn"} onClick={() => setGrade(level)}>
              {level} ({filterStudentsByGrade(payload.rows, level).length})
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
        {section || tab === "alumni" ? null : <label>Year <select value={year} onChange={(event) => setYear(event.target.value)}>{yearOptions.map((option) => <option key={option} value={option}>{option === "all" ? "All years" : option}</option>)}</select></label>}
        <label>Search <input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      </div>
      {payload.reconciliation ? <div className="card"><h3>Reconciliation</h3><p>{payload.reconciliation.map((item) => `${item.label}: ${item.count}`).join(" · ")}</p>{payload.mismatches?.length ? <ul>{payload.mismatches.map((item) => <li key={`${item.name}-${item.issue}`}>{item.name}: {item.issue}</li>)}</ul> : null}</div> : null}
      {payload.gaps.length ? <div className="card"><h3>Data quality</h3><ul>{payload.gaps.map((gap) => <li key={gap.label}><strong>{gap.label}.</strong> {gap.detail}</li>)}</ul></div> : null}
      <div className="table-wrap">
        <table>
          <thead><tr>{payload.columns.map((column) => <th key={column}><button type="button" onClick={() => setSort((current) => ({ column, dir: current?.column === column && current.dir === "asc" ? "desc" : "asc" }))}>{tab === "alumni" ? alumniColumnLabel(column) : column}</button></th>)}</tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="clickable" onClick={() => onOpen(row)}>
                {payload.columns.map((column) => <td key={column}>{row.cells[column] || "—"}{column === "Name" ? row.badges.map((badge) => <span key={badge} className="badge">{badge}</span>) : null}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="lede">Showing {rows.length} of {payload.rows.length}</p>
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
