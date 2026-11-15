# Deploy the Advancement Office dashboard

This is a Google Apps Script web app. Deploy it from **admissions@risr.ac.th**. Staff open one `/exec` link on a Mac, iPhone, or iPad. Google only lets `@risr.ac.th` accounts in. A personal Gmail account never sees the page.

The web app runs as **the person who opened it**, not as admissions@. Each person only reads sheets and calendars that their own Google account can already open. Do not switch this to “Execute as: Me”. That would show every staff member everything admissions@ can open.

The iMac file is unchanged. **Open Advancement Office.command** still serves `dist/advancement-office.html` at `http://localhost:4173`. Sign-in on that Mac still uses the Google popup. This guide is the online copy.

Do not put secrets in these files. This web app does not call OpenApply. It does not need Script Properties. The OA tours sync and Open House duplicator stay as webhook addresses each person pastes in Settings. Those addresses stay in that browser.

## Files

From `apps-script/` after `npm run apps-script`:

- `appsscript.json`
- `Code.gs`
- `Index.html` (the editor name must be exactly `Index`)
- `Walkin.html` (the editor name must be exactly `Walkin`)

`Index.html` is about 2 MB because the fonts, logos, and dashboard are in the one file. Pasting that into the script editor often stalls. Use clasp to upload, then use the Deploy button on script.google.com. The steps below do both.

`npm run apps-script` also refreshes `dist/advancement-office.html`, so the iMac file stays the same build.

## Step by step

1. On a computer that has Node, in this repository, run:

   ```bash
   npm install
   npm run apps-script
   ```

   You can skip this if you are deploying the `apps-script/` files already in the repository and you have not changed the dashboard.

2. Sign in to [script.google.com](https://script.google.com) as **admissions@risr.ac.th**.

3. Click **New project**. Rename it to `RISR Advancement Office`.

4. Open **Project Settings** (the gear). Check **Show "appsscript.json" manifest file in editor**. Copy the **Script ID**.

5. On that same computer, install clasp and sign in as admissions@:

   ```bash
   npm install -g @google/clasp
   clasp login
   ```

   In `apps-script/`, copy `.clasp.json.example` to `.clasp.json`. Replace `PASTE_THE_SCRIPT_ID` with the Script ID from step 4. `.clasp.json` is gitignored. Do not commit it.

   ```bash
   cd apps-script
   clasp push
   ```

   clasp asks before it replaces the project. Answer yes. The project should then show `appsscript.json`, `Code.gs`, `Index`, and `Walkin`.

6. In the editor, confirm `appsscript.json` matches the file you pushed. The web app section must stay:

   - Execute as: user accessing the web app (`USER_ACCESSING`)
   - Access: anyone in the risr.ac.th domain (`DOMAIN`)

   There is no `urlFetchWhitelist`. The webhook addresses are typed in Settings and are not known ahead of time. Do not add a whitelist unless you also add every webhook host, or Sync Now and Open House will fail.

7. You do not add Script Properties. Leave them empty. If a later change needs the OpenApply client id and secret, add `OA_CLIENT_ID` and `OA_CLIENT_SECRET` here yourself. Never paste them into `Code.gs` or the HTML.

8. Click **Deploy → New deployment**.
   - Click the gear and choose **Web app**.
   - Description: `Advancement Office`
   - Execute as: **User accessing the web app**
   - Who has access: **Anyone within risr.ac.th**
   - Click **Deploy**

   If the access list does not say risr.ac.th, you are not signed in as admissions@. Stop and sign in as that account. Do not choose **Anyone** or **Anyone with a Google account**.

9. Google asks admissions@ to authorize the app. Click **Allow**. The permission lines, in Google’s own words, are:

   - See, edit, create, and delete all your Google Sheets spreadsheets
   - See, edit, share, and permanently delete all the calendars you can access using Google Calendar
   - See, edit, create, and delete all your Google Docs documents
   - See your primary Google Account email address
   - Connect to an external service

   Those lines are the scopes in `appsscript.json`:

   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/documents`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/script.external_request`

   Sheets, Calendar, and Docs are the same access the iMac sign-in already asks for. “Connect to an external service” is new. It lets the web app call the OA tours sync webhook and the Open House duplicator. The call does not include the person’s Google token.

10. Copy the **Web app** URL. It ends in `/exec`. That is the link for the office. Do not send the `/dev` test URL. `/dev` is only for the account that owns the script.

11. Share the [master spreadsheet](https://docs.google.com/spreadsheets/d/1tSITP8DgTa4VdrfDO5uEq18WxWZ-tlrHTF4qRl8pXQw/edit) with each person who will open the dashboard, as **Viewer**. The page only reads it. Share the School Tour/Visit calendar (`c_ga82ohfe30hhckqp10n1ipvktc@group.calendar.google.com`) so the people who use **No show**, tour notes, or **New Walk-in Tour** can change events. A person who can open the web app but cannot open the sheet sees an empty Student List and an error, the same as on the iMac when that account cannot read the sheet.

12. Each staff member opens the `/exec` URL in Safari or Chrome, picks their `@risr.ac.th` account, and clicks **Allow** once. They see the same five permission lines. After that, the dashboard loads. An account outside risr.ac.th is stopped by Google before any student data is sent.

13. On **Tours/Visits**, **Walk-in** sits with **Sync Now**, **Attendance chart**, and **New Walk-in Tour**. It opens this same web app with `?page=walkin`. That page says the staff walk-in screen is not connected yet. It is not the walk-in form. To send **Walk-in** somewhere else, open **Settings**, leave the webhook URL filled in, paste a full `https://` address under **Walk-in URL**, and click **Save**. Clear that field and save to go back to `?page=walkin`. On the iMac file the field starts empty, so the button says **Walk-in app not set up yet** until you save an address.

14. In **Settings**, paste the OA tours sync webhook from the Grok Bot routine “OA tours sync (manual)”, and set the date, time, and interval. On **Open House**, open the connection control and paste that webhook URL and its Authorization value. These stay in this browser only. They do not copy over from the iMac’s localhost page. Paste them once on the new site.

15. Click **Sync Now**, then try one Open House duplicate when you are ready to create a real copy. Both are sent by Apps Script, from Google’s servers, with the same JSON as the iMac. The browser CORS check does not apply. If a routine rejects the call, it is checking for a browser Origin header. Let it accept a POST that has no Origin. The Authorization value for Open House is still sent. The Google sign-in token is not.

16. Calendar writes from this page use `sendUpdates=none`. New tour events are not given an OpenApply Registration ID. The page does not add Google Meet.

## Updating later

1. Run `npm run apps-script` if the dashboard code changed.
2. In `apps-script/`, run `clasp push`.
3. On script.google.com, **Deploy → Manage deployments → the web app → the pencil → New version → Deploy**.

The `/exec` URL stays the same. A new version is required when `Code.gs`, `Index.html`, or `Walkin.html` changes. Webhook addresses and the Walk-in URL saved in a browser do not need a new deploy.

If Google asks everyone to **Allow** again, the scopes changed. Read the new list before you approve it. It should still be the five lines above unless the code was given a new scope on purpose.

If **Walk-in** opens an old copy of the site, open **Manage deployments** and delete the older web app deployments so only one `/exec` URL remains. The button uses the URL of the deployed web app.

## What is different from the iMac

- Sign-in is Google’s Apps Script **Allow** screen, once per person. There is no Google Identity popup inside the page. Those popups are unreliable in the Apps Script frame.
- Sheet, Calendar, and Docs calls use that person’s Google account. The iMac file already worked this way after **Sign in with Google**.
- Sync Now and Open House are sent by Google’s servers. A routine that only allows a browser Origin has to allow a request with no Origin.
- Settings saved on localhost do not appear online. Paste the webhook and the Open House Authorization value again.
- **Walk-in** already has an address online (`?page=walkin`). On the iMac it stays unset until you save one.
- **Load data file**, **Save data file**, and **Demo data** still work.
- The master sheet tabs, headers, and column order are not changed by this deploy.
