# Local Advancement Office file

`dist/advancement-office.html` is the dashboard as one file. On a Mac, double-click **Open Advancement Office.command**. It serves port 4173 and opens `http://localhost:4173/advancement-office.html`. Leave the Terminal window open while you use the app.

The launcher looks for `dist/advancement-office.html` first. If that file is not there, it serves `advancement-office.html` from the same folder as the `.command` file. A downloaded pair can sit side by side. If the HTML or `python3` is missing, Terminal stays open and asks you to press Return.

The public OAuth client ID and the master spreadsheet ID are already in the config block at the top of the HTML file. The client is the Internal Web client for project `advancement-office`. Its JavaScript origins are `http://localhost:4173` and `http://127.0.0.1:4173`.

Double-clicking the HTML file itself still opens sample data. **Load data file** and **Save data file** work from that page. Google sign-in does not run on a `file://` page, which is why the launcher uses localhost.

Rebuild the file with:

```bash
npm run standalone
```

## Sign in

1. Double-click `Open Advancement Office.command`.
2. Click **Sign in with Google** and use a `@risr.ac.th` account that can read the master sheet and edit the School Tour/Visit calendar.
3. Open **Settings** and paste the webhook URL from the Grok Bot routine “OA tours sync (manual)”. It stays in this browser only.
4. In **Settings**, choose a date (optional), a time, and an interval: weekdays at that time, daily, every N hours, or manual only. Times are Asia/Bangkok. Save stores the choice in this browser.
5. **Sync Now** still runs the job immediately. The POST body is JSON with `mode`, `date`, `time`, `interval`, `everyHours`, and `timezone` so the Grok Bot routine can read the schedule. The page then re-reads the master sheet when a new Sync Log row appears. OpenApply is not called from the browser, and this file does not keep its own clock.

The OAuth client, scopes, and origins are already created. No further Google Cloud setup is required for this client.

The signed-in account writes No Show tags, walk-in events, and notes to the calendar in `calendarId` (the School Tour/Visit calendar). Every write uses `sendUpdates=none` and does not add Google Meet.

## Weekday refresh

Seth's assistant fills the master spreadsheet each weekday at 05:55 Asia/Bangkok from OpenApply, Notion, and Weena's sheets. The column layout is in `MASTER_SHEET.md`. The HTML file only reads that spreadsheet. It does not hold OpenApply or Notion credentials.

## Optional Mac app

A Tauri wrapper is the same HTML file inside a window. It is optional.

1. Install Rust from [rustup.rs](https://rustup.rs).
2. From the repo, run `npm create tauri-app@latest advancement-office-mac` and choose a vanilla frontend.
3. Replace the frontend `index.html` with `dist/advancement-office.html`, or point Tauri's `frontendDist` at `dist`.
4. In `src-tauri/tauri.conf.json`, allow navigation to `https://accounts.google.com`, `https://oauth2.googleapis.com`, `https://sheets.googleapis.com`, and `https://www.googleapis.com`.
5. The window origin will not be `file://`. Register that origin (Tauri often uses `http://localhost` or `tauri://localhost`) on the same OAuth client.
6. `npm run tauri build` produces the Mac app.

Until that origin is registered, use the HTML file and Load data file.
