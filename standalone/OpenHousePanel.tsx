import { useState } from "react";
import { normalizeWebhookUrl } from "@/lib/standalone/sync-webhook";
import { syncControlLabel } from "@/lib/standalone/tabs";
import {
  openHouseAuthKey,
  openHouseConfirmText,
  openHouseDivisions,
  openHouseDuplicateBody,
  openHouseRecentKey,
  openHouseSuccessMessage,
  openHouseUrlKey,
  parseOpenHouseRecent,
  rememberOpenHouseRequest,
  type OpenHouseDivisionId,
  type OpenHouseRequest,
} from "@/lib/standalone/open-house";

function SyncTabButton({ busy, onSync }: { busy: boolean; onSync: () => void }) {
  return (
    <button className="btn primary" type="button" data-sync="tab" disabled={busy} title="Runs the OA tours, calendar, and master sheet sync through the bot." onClick={onSync}>
      {busy ? "Requesting…" : syncControlLabel}
    </button>
  );
}

type CardState = "idle" | "confirm" | "sending" | "success" | "error";

export function OpenHousePanel({ today, syncing, onSync }: { today: string; syncing: boolean; onSync: () => void }) {
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState(() => localStorage.getItem(openHouseUrlKey()) ?? "");
  const [authDraft, setAuthDraft] = useState(() => localStorage.getItem(openHouseAuthKey()) ?? "");
  const [recent, setRecent] = useState<OpenHouseRequest[]>(() => parseOpenHouseRecent(localStorage.getItem(openHouseRecentKey())));
  const [dates, setDates] = useState<Record<OpenHouseDivisionId, string>>({ PreK: "", ES: "", MSHS: "" });
  const [starts, setStarts] = useState<Record<OpenHouseDivisionId, string>>({ PreK: "", ES: "", MSHS: "" });
  const [ends, setEnds] = useState<Record<OpenHouseDivisionId, string>>({ PreK: "", ES: "", MSHS: "" });
  const [status, setStatus] = useState<Record<OpenHouseDivisionId, CardState>>({ PreK: "idle", ES: "idle", MSHS: "idle" });
  const [notes, setNotes] = useState<Record<OpenHouseDivisionId, string>>({ PreK: "", ES: "", MSHS: "" });

  function saveConnection() {
    const url = normalizeWebhookUrl(urlDraft);
    if (!url) {
      setNotes((current) => ({ ...current, PreK: "Paste a full https webhook URL." }));
      return;
    }
    if (!authDraft.trim()) {
      setNotes((current) => ({ ...current, PreK: "Paste the Authorization header value." }));
      return;
    }
    localStorage.setItem(openHouseUrlKey(), url);
    localStorage.setItem(openHouseAuthKey(), authDraft.trim());
    setUrlDraft(url);
    setAuthDraft(authDraft.trim());
    setConnectionOpen(false);
  }

  async function send(division: OpenHouseDivisionId) {
    const date = dates[division];
    const url = normalizeWebhookUrl(localStorage.getItem(openHouseUrlKey()) ?? "");
    const authorization = (localStorage.getItem(openHouseAuthKey()) ?? "").trim();
    if (!url || !authorization) {
      setConnectionOpen(true);
      setStatus((current) => ({ ...current, [division]: "error" }));
      setNotes((current) => ({ ...current, [division]: "Open Connection and save the webhook URL and Authorization value." }));
      return;
    }
    setStatus((current) => ({ ...current, [division]: "sending" }));
    setNotes((current) => ({ ...current, [division]: "" }));
    const requestedAt = new Date().toISOString();
    const body = openHouseDuplicateBody({ division, date, start: starts[division], end: ends[division], requestedAt });
    try {
      const response = await fetch(url, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json", Authorization: authorization },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`The request failed (HTTP ${response.status}).`);
      const next = rememberOpenHouseRequest(recent, { division, date, requestedAt });
      localStorage.setItem(openHouseRecentKey(), JSON.stringify(next));
      setRecent(next);
      setStatus((current) => ({ ...current, [division]: "success" }));
      setNotes((current) => ({ ...current, [division]: openHouseSuccessMessage }));
    } catch (reason) {
      setStatus((current) => ({ ...current, [division]: "error" }));
      setNotes((current) => ({ ...current, [division]: reason instanceof Error ? reason.message : "The request failed." }));
    }
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h2>Open House</h2>
          <p className="lede">Duplicate the previous unpublished Open House for one division. The copy stays unpublished until you publish it.</p>
        </div>
        <div className="header-actions">
          <button className="btn" type="button" aria-label="Open House connection settings" onClick={() => setConnectionOpen(true)}>⚙</button>
          <SyncTabButton busy={syncing} onSync={onSync} />
        </div>
      </div>
      <h3 className="tour-section font-heading">Duplicate Open House</h3>
      <div className="oh-grid">
        {openHouseDivisions.map((division) => {
          const date = dates[division.id];
          const state = status[division.id];
          const busy = state === "sending";
          return (
            <article key={division.id} className="card">
              <h3 className="font-heading">{division.title}</h3>
              <p className="lede">{division.range}</p>
              <label>Date
                <input type="date" required min={today} value={date} onChange={(event) => { setDates({ ...dates, [division.id]: event.target.value }); setStatus({ ...status, [division.id]: "idle" }); }} />
              </label>
              <label>Start
                <input type="time" placeholder="same as last" value={starts[division.id]} onChange={(event) => setStarts({ ...starts, [division.id]: event.target.value })} />
              </label>
              <label>End
                <input type="time" placeholder="same as last" value={ends[division.id]} onChange={(event) => setEnds({ ...ends, [division.id]: event.target.value })} />
              </label>
              <p className="lede">Leave the times empty to use the same times as the last open house.</p>
              {state === "confirm" ? (
                <div>
                  <p>{openHouseConfirmText(division.title, date)}</p>
                  <div className="header-actions">
                    <button className="btn primary" type="button" onClick={() => void send(division.id)}>Duplicate as unpublished</button>
                    <button className="btn" type="button" onClick={() => setStatus({ ...status, [division.id]: "idle" })}>Go back</button>
                  </div>
                </div>
              ) : (
                <button className="btn primary" type="button" disabled={!date || busy} onClick={() => setStatus({ ...status, [division.id]: "confirm" })}>
                  {busy ? "Sending…" : "Duplicate as unpublished"}
                </button>
              )}
              {state === "sending" ? <p role="status">Sending…</p> : null}
              {notes[division.id] ? <p className={state === "error" ? "warn" : "notice"} role="status">{notes[division.id]}</p> : null}
            </article>
          );
        })}
      </div>
      <div className="card">
        <h3 className="font-heading">Recent requests</h3>
        {recent.length ? (
          <ul>
            {recent.map((item) => (
              <li key={`${item.requestedAt}-${item.division}`}>{openHouseDivisions.find((division) => division.id === item.division)?.title} · {item.date} · {item.requestedAt.replace("T", " ").replace(/\.\d{3}Z$/, " UTC")}</li>
            ))}
          </ul>
        ) : <p className="lede">No requests from this browser yet.</p>}
      </div>
      {connectionOpen ? (
        <div className="modal-back" onClick={() => setConnectionOpen(false)}>
          <form className="modal oh-connection" onClick={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); saveConnection(); }}>
            <header>
              <h3 className="font-heading">Connection</h3>
              <button className="btn" type="button" onClick={() => setConnectionOpen(false)}>Close</button>
            </header>
            <div className="body">
              <p className="lede">Saved in this browser only. Nothing is written into the dashboard file.</p>
              <label>Webhook URL
                <input value={urlDraft} onChange={(event) => setUrlDraft(event.target.value)} placeholder="https://" autoComplete="off" />
              </label>
              <label>Authorization
                <input value={authDraft} onChange={(event) => setAuthDraft(event.target.value)} placeholder="Bearer …" autoComplete="off" />
              </label>
              <button className="btn primary" type="submit">Save</button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
