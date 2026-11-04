# Local Advancement Office file

`dist/advancement-office.html` is the dashboard as one file. Double-click it. Chrome or Safari opens it with the sample data, the tabs, charts, PNG/PDF export, the notes panel, and the walk-in form. Fonts and logos are inside the file. There is no server and no secret in the file.

Rebuild it with:

```bash
npm run standalone
```

## What Seth sets up

1. In Google Cloud, create an OAuth client of type **Web application**. This client ID is public.
2. If the Cloud project is in the `risr.ac.th` Workspace, set the consent screen to **Internal**.
3. Add the scopes `openid`, `email`, `https://www.googleapis.com/auth/spreadsheets`, and `https://www.googleapis.com/auth/calendar`.
4. Google sign-in does not accept a `file://` page. Add this authorized JavaScript origin: `http://localhost:4173`.
5. Open the HTML file in a text editor. At the top, in `ADVANCEMENT_OFFICE_CONFIG`, paste the client ID into `googleClientId` and the master spreadsheet ID into `masterSheetId`.
6. From the folder that contains the HTML file, run `python3 -m http.server 4173` and open `http://localhost:4173/advancement-office.html`.
7. Click **Sign in with Google** and use a `@risr.ac.th` account that can edit the admissions calendar and read the master sheet.

Double-click still works for sample data and for **Load data file**. Use that when you are offline. **Save data file** writes the JSON the Load button reads.

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
