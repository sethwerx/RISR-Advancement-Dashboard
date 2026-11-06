# Advancement Office

Internal dashboard for the Admissions, Registration, and Alumni Relations office at Ruamrudee International School Ratchapruek. The first tab is **Tours/Visits**. It reads tour registrations from OpenApply, merges them with the School Tour/Visit Google Calendar, and keeps a master Google Sheet. Seth Janekarnkit marks “Did Not Attend” in OpenApply by hand. This app never writes to OpenApply.

All times are **Asia/Bangkok (ICT)**. The interface is in English. Titles use Bebas Neue, headings use Oswald, and body text uses Calibri with Carlito, then sans-serif, as the fallback. The header uses the white logo on the navy bar. Chart and print exports use the navy logo. The favicon and other small marks use the icon. Primary navy is `#23355D`. Walk-in fields live in `src/tabs/tours/walkinForm.config.ts` and follow the inferred OpenApply tour form. Slots are 8:00 or 10:00 and last 120 minutes.

## Stack

- Next.js (App Router) and TypeScript
- Tailwind CSS
- API routes on the server, so OpenApply and Google secrets never reach the browser
- Vitest for the tour rules
- Recharts for the analytics window

## Sample data

If OpenApply or Google credentials are missing, the app starts in **sample data** mode. The families are fictional. Set `MOCK_MODE=true` to force sample data even when credentials exist, or `MOCK_MODE=false` to require live credentials.

```bash
npm install
npm test
npm run dev
```

Open http://localhost:3000.

## Configuration

Copy the variable names into `.env.local`:

```bash
cp .env.example .env.local
```

`.env.example` lists names only. Defaults for non-secret values live in `src/config/dashboard.config.ts`.

| Variable | Purpose |
| --- | --- |
| `OPENAPPLY_CLIENT_ID` / `OPENAPPLY_CLIENT_SECRET` | OAuth client credentials. Read-only. |
| `OPENAPPLY_BASE_URL` | Defaults to `https://risr.openapply.com/api/v3`. |
| `OPENAPPLY_TOKEN_URL` | Defaults to `https://risr.openapply.com/oauth/token`. |
| `OPENAPPLY_TOUR_EVENT_IDS` | Comma-separated event ids. Default `22964,22965,23638,24622` (PreK/KG, ES/MS/HS, previous PreK/KG 10am, School Break). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth web client for `admissions@risr.ac.th`. |
| `GOOGLE_REDIRECT_URI` | Defaults to `http://localhost:3000/api/auth/google/callback`. |
| `GOOGLE_REFRESH_TOKEN` | Optional. After the first browser sign-in the refresh token is also stored in `data/google-oauth.json` (gitignored). |
| `SESSION_SECRET` | Signs the sign-in cookie. Required before Google sign-in. |
| `GOOGLE_CALENDAR_ID` | School Tour/Visit calendar. |
| `GOOGLE_ORGANIZER_EMAIL` | Must be the signed-in account. Default `admissions@risr.ac.th`. |
| `GOOGLE_GUEST_EMAILS` | Default `sethj@risr.ac.th,passarananv@risr.ac.th`. |
| `GOOGLE_NOTES_TEMPLATE_DOC_ID` | Doc that is copied for each new tour. |
| `GOOGLE_MASTER_SHEET_ID` | Existing master spreadsheet. Leave blank to find or create “RISR Advancement Dashboard”. |
| `GOOGLE_MASTER_SHEET_NAME` | Name used when the sheet is created or searched for. |
| `NOTION_TOKEN` | Notion integration token. Read-only queries of the pipeline, student list, and retention databases. |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Optional. Raw JSON, or a path to a service-account key, used to read source spreadsheets and write the master sheet. If it is blank, Sheets uses the admissions@ OAuth refresh token. |
| `MOCK_MODE` | `true` or `false`. Blank follows the rule above. |

## OpenApply credentials

1. In OpenApply, create an OAuth client that can use the client-credentials grant for the school API.
2. Put the client id and secret in `.env.local`.
3. Confirm the tour event ids. Change `OPENAPPLY_TOUR_EVENT_IDS` or `src/config/dashboard.config.ts` if they change.

The server requests a token with HTTP Basic auth and `grant_type=client_credentials`, caches it, and refreshes it about every 23 hours. A 401 retries once with a new token. The request uses a normal browser User-Agent because default Python clients have been rejected. The token and the secrets are never logged.

The client only calls:

- `POST /oauth/token`
- `GET /events/{id}` (all registrations come back in one response)
- `GET /students/{id}`

There is no attendance field in the API, and there is no write method.

## Google OAuth

Use a Google Cloud project that `admissions@risr.ac.th` can authorize. An internal Workspace consent screen is the right choice for a single school account.

1. Create an OAuth client of type **Web application**.
2. Add the redirect URI, for local work `http://localhost:3000/api/auth/google/callback`.
3. Add these scopes: openid, email, Calendar, Sheets, Drive, and Docs. Drive access is required because the notes template already exists and must be copied. `drive.file` cannot see that template.
4. Put the client id, secret, and a long `SESSION_SECRET` in `.env.local`.
5. Run the app and choose **Sign in with Google**. The hint is `admissions@risr.ac.th`.
6. Calendar writes are refused for any other account.

The refresh token is stored in `data/google-oauth.json`. For a server deploy, copy it into `GOOGLE_REFRESH_TOKEN` and keep `data/` on a persistent disk. Do not commit either value.

### What a calendar write does

- Title: `Tour (OA) - First (Preferred) Last (Grade)`. With no preferred name: `Tour (OA) - First Last (Grade)`. Siblings in one registration are one event, joined with ` & `.
- A no-show title is `Tour (OA) [No Show] - …`.
- Duration is 2 hours, timezone `Asia/Bangkok`.
- Guests are the two addresses above. The organizer is the signed-in admissions account.
- The description has one OpenApply profile link per child, a bullet `OA Registration ID: {id}`, and a note to use the notes doc. That registration id is how later syncs match the event. Older events fall back to student name plus the ICT date.
- The event is created with the normal invite (`sendUpdates=all`). Every later edit uses `sendUpdates=none`.
- No request adds or removes a Google Meet / conference link.
- A notes Google Doc is copied from the template, named `Notes - Tour - Name (Grade)`, and attached as **Tour Notes**.

**Copy OA tours to Calendar** shows a preview first. It creates events only for `scheduled` registrations that are missing. Canceled registrations are never created. Rescheduled or canceled tours that are already on the calendar are flagged and are not moved or deleted.

**No show** renames the event (`sendUpdates=none`) and leaves a reminder up until **Done**: mark Did Not Attend in OpenApply. Done logs “OA updated”. Undo removes the tag and logs “Undo”. A past tour that was not marked no-show is labeled **Attended**. Older sheet values `Show` and `Showed` are read as Attended.

**New Walk-in Tour** opens a form driven by `src/tabs/tours/walkinForm.config.ts`. Submitting it creates a two-hour calendar event titled `Walk-in - First (Preferred) Last (Grade)`, with the same guests and no Meet link, and logs a master-sheet row with source `Walk-in`.

Each tour has a detail page. A notes panel slides out from the right; whether it is open is remembered in the browser. Drafts autosave locally. **Save** writes the structured notes into the calendar event’s Notes section (`sendUpdates=none`, conference data untouched) and into the master sheet.

## Master sheet

The workbook has three tabs, and the list is the place to add a tab for a future dashboard section (`src/lib/sheet/schema.ts`):

- **Tours** — one row per registration, including the notes columns.
- **No Show Log** — No Show, OA updated, and Undo.
- **Print** — Tours/Visits columns, frozen header, a date filter for the rolling window (14 days back through 45 days ahead, ICT), and column widths chosen for a landscape page.

The Sheets API has no page-setup field, so landscape and fit-to-width are applied in two places the API does allow: the in-app **Tours/Visits print view** (`/print`, A4 landscape, table at full width, repeating header) and the Google export link (`portrait=false` and `fitw=true`) returned with the live sheet. The Print tab’s date filter is reapplied when the dashboard refreshes the sheet.

In sample mode the same three grids open from **Master sheet** and are stored in `data/mock-store.json`.

## Analytics

**Analytics** opens a floating window. **Dock to side** pins it. Charts: tours per month, show vs no-show, canceled rate, tour-to-application conversion, lead sources, grade mix, and host load. Each chart, and the whole panel, exports to PNG and PDF.

Show rate uses past scheduled tours. A past tour without a no-show tag is Attended. Conversion means at least one child has moved past inquiry (applied, waitlisted, admitted, enrolled, declined, or withdrawn).

Structured notes (grade of interest, lead source, interest 1–5, concerns, next step, tour guide, comment) save into the calendar description’s Notes section and the Tours sheet.

## Tests

```bash
npm test
npm run typecheck
```

Covered:

- Title builder: preferred name, no preferred name, siblings, no-show tag
- Matching: new, synced, rescheduled, canceled (with and without a calendar event), name-and-date fallback
- Time: `10:00 AM` in ICT plus 120 minutes, midnight, noon, and a tour that crosses midnight

## Local file

`dist/advancement-office.html` opens by double-click. Sample data and **Load data file** work offline. Google sign-in reads the master sheet from a browser and is described in `STANDALONE.md`. After sign-in, **Sync Now** posts to a webhook URL saved in **Settings** (this browser only). Settings also stores a date, time, and interval in Asia/Bangkok and sends that JSON with Sync Now. The morning job still belongs to the Grok Bot routine. The sheet layout is `MASTER_SHEET.md`.

## Deployment

Vercel is the host to use. The weekday 05:55 Asia/Bangkok sync cannot live inside a short-lived server, so `vercel.json` schedules it at 22:55 UTC, Sunday through Thursday. Step-by-step setup, including the `@risr.ac.th` sign-in gate, is in `DEPLOY.md`.

A school VM or Docker image also works if it stays running and keeps a `data/` directory. On those hosts the in-process clock runs the 05:55 job. Set `AUTH_REQUIRED=true` when the machine is reachable beyond the office.

## Add a tab

Tabs are plug-ins. Adding one is a folder plus one registry line.

1. Create `src/tabs/<id>/index.ts` that exports a `TabDefinition`:

   ```ts
   export const reportsTab = {
     id: "reports",
     label: "Reports",
     href: "/reports",
     enabled: true,
     description: "Saved reports.",
     Component: ReportsScreen,
   };
   ```

2. Import it in `src/tabs/registry.ts` and append it to `tabs`.

`src/app/[[...slug]]/page.tsx` renders `Component` for any enabled entry. You do not add a new page file. Placeholder entries stay in the registry with `enabled: false` so the tab is visible but inert. Retention and Analytics stay at the end that way. Tour charts already open from Tours/Visits; the Analytics tab is the future full-page home.

The working order is Tours/Visits, Applicants, Assessments, Admitted, Canceled/Declined, Offers, Student List, Withdrawals, Alumni, and Scholarships. Retention and Analytics stay disabled at the end. Labels do not put spaces around a slash.

## Office tabs

Applicants, Assessments, Admitted, Canceled/Declined, Offers, Student List, Withdrawals, Alumni, and Scholarships read a local snapshot (`data/office-snapshot.json`, gitignored). **Refresh now**, and a weekday job at 05:55 Asia/Bangkok, rebuild that snapshot and copy one sheet per tab plus a Sync Log into the master Google spreadsheet. The same run refreshes the Tours sheet when live Google access is available.

OpenApply, Notion, and the source spreadsheets are read-only. The only write is the master spreadsheet. Source file ids live in `src/config/sources.ts`. The student ID of record is the ID No. on Weena's student list. OpenApply's Student ID field is not shown and is not used for matching. Reconciliation uses a stored OpenApply record link when one exists, then name plus date of birth, with a fuzzy name. A match on name alone is badged low confidence. An active Weena row with no OpenApply record is the first reconciliation mismatch.

The year filter defaults to 2026-27. On Applicants, OpenApply pending rows stay visible back to enrollment year 2021. Student List treats a row as active when it has a No.; LOA students stay listed with an LOA badge, and the page shows Weena, OpenApply enrolled, and Notion counts plus mismatches. Withdrawal reasons are categorized by `src/config/withdrawal-reasons.ts`. Offers are derived from the admitted date, seat-reservation tags, and status level. Scholarships show the Finance list date as a data-as-of note. Each tab has a data-quality panel, search, sort, a notes slide-out, and KPI cards that open a chart window with PNG and PDF export.

Without `OPENAPPLY_CLIENT_ID`, `OPENAPPLY_CLIENT_SECRET`, `NOTION_TOKEN`, and Google credentials, the snapshot is fictional sample data that follows the real column names. Do not put real student records in the repo.

If the tab stores rows, add a sheet descriptor in `src/lib/sheet/schema.ts`. The sheet sync creates any missing tab. Keep OpenApply access in `src/lib/server/openapply.ts`, which is read-only apart from the token request.
