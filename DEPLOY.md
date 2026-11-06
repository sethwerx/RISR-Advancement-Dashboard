# Deploy the Advancement Office dashboard

Use **Vercel**. The app is a Next.js site, and the weekday sync has to be an external clock. A normal server process on Vercel shuts down between clicks, so the in-app 05:55 timer would not fire. `vercel.json` asks Vercel Cron to call `/api/cron/sync` at **22:55 UTC, Sunday through Thursday**. That is **05:55 Asia/Bangkok, Monday through Friday**. Thailand does not use daylight saving time.

A school VM is the alternative only if you want one machine that stays on. This guide is the Vercel path.

Do not put secrets in Git. Paste them only into Vercel’s environment settings.

## 1. Create the Vercel project

1. Sign in at [vercel.com](https://vercel.com) with the account that should own the site.
2. Choose **Add New… → Project**.
3. Import the GitHub repository `sethwerx/RISR-Advancement-Dashboard`.
4. Framework preset: **Next.js**. Leave the build command as `next build` and the output as the Next.js default.
5. Do not deploy yet. Open **Environment Variables** first and add every name in the next section. Apply them to Production (and Preview if you want preview deploys locked the same way).
6. Deploy. Copy the site URL, for example `https://your-project.vercel.app`.

## 2. Environment variables

Paste these names. Values stay blank in the repository. Generate the two random strings on your own computer with `openssl rand -base64 32`.

| Name | What to paste |
| --- | --- |
| `OPENAPPLY_CLIENT_ID` | OpenApply OAuth client id |
| `OPENAPPLY_CLIENT_SECRET` | OpenApply OAuth client secret |
| `OPENAPPLY_BASE_URL` | `https://risr.openapply.com/api/v3` |
| `OPENAPPLY_TOKEN_URL` | `https://risr.openapply.com/oauth/token` |
| `OPENAPPLY_TOUR_EVENT_IDS` | `22964,22965,23638,24622` |
| `GOOGLE_CLIENT_ID` | Web OAuth client id from Google Cloud |
| `GOOGLE_CLIENT_SECRET` | That client’s secret |
| `GOOGLE_REDIRECT_URI` | `https://YOUR-DOMAIN/api/auth/google/callback` |
| `GOOGLE_REFRESH_TOKEN` | One-time offline token for `admissions@risr.ac.th` (step 4) |
| `GOOGLE_CALENDAR_ID` | `c_ga82ohfe30hhckqp10n1ipvktc@group.calendar.google.com` |
| `GOOGLE_ORGANIZER_EMAIL` | `admissions@risr.ac.th` |
| `GOOGLE_GUEST_EMAILS` | `sethj@risr.ac.th,passarananv@risr.ac.th` |
| `GOOGLE_NOTES_TEMPLATE_DOC_ID` | `1OC8AxiBwOiYAloJGZFfuq-cuLCTXrjzkyL9jIBHr1Z8` |
| `GOOGLE_MASTER_SHEET_ID` | Id of the master spreadsheet the app may write |
| `GOOGLE_MASTER_SHEET_NAME` | `RISR Advancement Dashboard` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | The service-account key JSON, as one line |
| `NOTION_TOKEN` | Internal integration secret |
| `SESSION_SECRET` | Long random string. Signs the sign-in cookie |
| `CRON_SECRET` | A different long random string. Vercel sends it with the weekday job |
| `ALLOWED_EMAIL_DOMAIN` | `risr.ac.th` |
| `MOCK_MODE` | `false` once the credentials above are real |

Leave `AUTH_REQUIRED` unset on Vercel. The sign-in gate turns on by itself there.

After `GOOGLE_REDIRECT_URI` matches the real domain, redeploy.

## 3. Google sign-in (who may open the site)

Anyone with a `@risr.ac.th` Google account can open the dashboard. Other Google accounts are rejected. The account chooser is also limited to that domain, and the server checks the address again.

1. Open [Google Cloud Console](https://console.cloud.google.com) in a project the school controls. If the project lives inside the `risr.ac.th` Workspace, set the OAuth consent screen to **Internal**. That is the strongest restriction.
2. On the consent screen, add the scopes `openid`, `email`, `https://www.googleapis.com/auth/calendar`, `https://www.googleapis.com/auth/spreadsheets`, `https://www.googleapis.com/auth/drive`, and `https://www.googleapis.com/auth/documents`.
3. Create an OAuth client of type **Web application**.
4. Authorized JavaScript origin: `https://YOUR-DOMAIN`.
5. Authorized redirect URI: `https://YOUR-DOMAIN/api/auth/google/callback`.
6. Copy the client id and secret into `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

Staff then use **Sign in with Google** on `/sign-in`.

## 4. admissions@ for Calendar and Docs

Sheet reads and the master spreadsheet use the service account in the next step. Calendar events and the tour-notes document still run as `admissions@risr.ac.th`.

1. Confirm `admissions@risr.ac.th` can change events on the calendar **School Tour/Visit** (`c_ga82ohfe30hhckqp10n1ipvktc@group.calendar.google.com`).
2. Share the notes template document (`1OC8AxiBwOiYAloJGZFfuq-cuLCTXrjzkyL9jIBHr1Z8`) with `admissions@risr.ac.th` as **Viewer**. The app copies it; it does not need to be public.
3. Visit `https://YOUR-DOMAIN/api/auth/google/start?connect=admissions` while signed into `admissions@risr.ac.th`.
4. Approve the calendar, spreadsheets, drive, and documents access.
5. The next page shows a refresh token once. Paste it into `GOOGLE_REFRESH_TOKEN` and close the page. Do not commit it.
6. Redeploy.

If Google does not show a new token, open the Google Account security page for `admissions@`, remove this app’s access, and run the connect link again.

## 5. Service account for spreadsheets

1. In the same Google Cloud project, create a service account. Skip optional role grants.
2. Create a JSON key and download it. Do not commit that file.
3. Paste the whole JSON into `GOOGLE_SERVICE_ACCOUNT_JSON` as a single line. The `private_key` field keeps its `\n` sequences.
4. Enable the **Google Sheets API** for the project.
5. Create a new spreadsheet named `RISR Advancement Dashboard`, owned by the office. Copy the id from its URL (`https://docs.google.com/spreadsheets/d/THIS-PART/edit`) into `GOOGLE_MASTER_SHEET_ID`.
6. Share that spreadsheet with the service account’s `client_email` as **Editor**. This is the only spreadsheet the app writes. It adds one tab per dashboard tab, a Sync Log, and a Snapshot tab.
7. Share each source spreadsheet below with the same service account as **Viewer**:

| Spreadsheet | Id |
| --- | --- |
| STUDENT LIST SY2026-2027 | `156hsISrGNmL2Q-90BsEwhhZ0n6kWwdcZ_Dp15JVXl6A` |
| STUDENT LIST SY2025-2026 | `1oEwGqc72zHtOwkKptX0rA_i7qebK15CgYff-JKdUjF0` |
| Tracking Sheet - New Students | `1MYGE3uWkKJ4G9chxdVdBm7Xrhs9dr7GzNFWYOVHYZtw` |
| Student Withdrawals (All Academic Years) | `1f7t-vNka0rjZF6mUSPsY21RcTzSJeJwcysoVqMA5HU0` |
| Student Withdrawals SY2025-2026 | `1L5cpJlBMoWQ5rPBSVzLVdJR2rMyhB2YpwLMQtMxfBp0` |
| Student Withdrawals SY2026-2027 | `1wHCNqk7bGcNBiftTCH7qM2bdAPRaoElhB_Gzj3Hsugs` |
| OA Withdrawal & Promotion Preview 2026-27 | `14xB07GlDUxI7TWzK23skl-c4H28EwCD_Ho0VNBReQOY` |
| Copy of RISR Alumni Database (latest) | `1hcmeWBCqlzWcx0Bbh8KfrpcoETZCKatEczQ6samOunM` |
| RISR Alumni Database (original) | `1-sEOewTrOAI0HJATkSrE-gQ2zl8VmjWNt6O0qa653qE` |
| Scholarship student list as of 6 March 2026 | `11HgWdvXW5ftuo1lbzdIzDxXJmBCs34-ncZGExiutkOY` |

## 6. Notion

1. Open [Notion integrations](https://www.notion.so/my-integrations) and create an **internal** integration.
2. Copy the secret into `NOTION_TOKEN`.
3. On each database, open **••• → Connections** and add that integration:
   - School Admission Pipeline
   - Student List 2025/26
   - Student Retention Pipeline

The integration can read those databases. It is not given permission to edit them.

## 7. OpenApply

1. In OpenApply, create an OAuth client that uses the client-credentials grant for the API.
2. Paste the id and secret into `OPENAPPLY_CLIENT_ID` and `OPENAPPLY_CLIENT_SECRET`.
3. Leave the client read-only. The app never writes to OpenApply. Its only POST is the token request.

## 8. Cron and a first check

1. Confirm `CRON_SECRET` is set. Vercel sends it as `Authorization: Bearer …` when the cron runs. The route rejects every other caller.
2. Redeploy after the last variable change.
3. Open the site. You should land on **Sign in**. A `@risr.ac.th` account gets in. A Gmail account does not.
4. On any office tab, click **Refresh now** once. That fills the master spreadsheet. Later weekday mornings, the cron does the same job.
5. If the cron times out, the Vercel Hobby plan stops a function at about 10 seconds and this sync can run longer. Move the project to **Pro** (the cron route asks for 60 seconds) rather than changing hosts.

Source spreadsheets, OpenApply, and Notion stay read-only. The master spreadsheet is the only file the app writes.
