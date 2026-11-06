# Master spreadsheet schema

The local dashboard reads one Google spreadsheet. Row 1 of each tab is the header. An external weekday job (05:55 Asia/Bangkok) fills these tabs from OpenApply, Notion, and Weena's sheets. The HTML file does not write this spreadsheet.

The student ID column is Weena's ID No. Leave it blank when the person is not on that list. Do not copy OpenApply's Student ID field into it.

Sheet titles must match exactly, including `Canceled/Declined` and `Student List`. The tours tab may be named `Tours` or `Tours/Visits`. When both exist, the local file uses `Tours/Visits`.

## Tours

The tab title is `Tours`. `Tours/Visits` is accepted as the same tab. Columns are the same either way.

`Registration ID`, `OA Event ID`, `Tour type`, `Source`, `Date`, `Time`, `End`, `Students`, `Grades`, `OA Student IDs`, `OA Status`, `Registration state`, `Host`, `Campus`, `Attendees`, `Parent`, `OA note`, `Calendar event ID`, `Calendar link`, `Sync status`, `Attendance`, `Notes doc`, `Grade of interest`, `Lead source`, `Interest level`, `Concerns`, `Next step`, `Tour guide`, `Comment`, `Notes updated`, `Profile URLs`

`Date` is `YYYY-MM-DD`. `Time` is `8:00 AM` or `10:00 AM`. `Calendar event ID` is the Google Calendar event id used by No Show, walk-in, and notes. `Attendance` is `Attended`, `No show`, or blank.

## Applicants

`Name`, `OA id`, `Student ID`, `Grade`, `Enrollment year`, `Applied`, `Inquired`, `Stage`, `Fee`, `Lead source`, `Nationality`, `Gender`, `Previous school`

`Stage` is `Pending` (toured, or started an application and stopped) or `Applicant`. `Enrollment year` is a four-digit year such as `2026`. `OA id` is the OpenApply record number.

## Assessments

`Name`, `Grade`, `Enrollment year`, `Assessment date`, `Type`, `Result`, `Decision`, `Status`, `ELD/LS`

`Status` is `Scheduled`, `Done, awaiting result`, or `Reassess`. `ELD/LS` is `Yes` or blank.

## Admitted

`Name`, `OA id`, `Grade`, `Enrollment year`, `Admitted`, `Enrolled`, `Stage`, `Invoice`, `Fee paid`, `Start date`, `Payment`, `Class`

`Stage` is `Admitted, not yet enrolled` or `Admitted → Enrolled`. Dates are `YYYY-MM-DD`.

## Canceled/Declined

`Name`, `OA id`, `Grade`, `Enrollment year`, `Declined`, `Reason`, `Outcome`, `Tags`, `Notion reason`, `Previous school`

`Outcome` is `Canceled` (family canceled the application or declined the offer), `Declined` (the school could not admit them), or `Not stated`.

## Offers

`Name`, `Grade`, `Offer date`, `Decision`, `Signatures`, `Seat reservation`, `Scholarship`, `Outcome`

`Outcome` is `Admitted`, `Historical admitted`, or `Manual tracking`. Keep a row when the offer later disappears from OpenApply.

## Student List

`No.`, `Student ID`, `OA id`, `Name`, `Grade`, `Homeroom`, `Gender`, `Nationality`, `DOB`, `Start date`, `Status`, `Scholarship`, `Sibling`

`No.` is Weena's row number. A filled `No.` means active. `Status` `LOA` stays on the list. `Student ID` is Weena's ID No. from STUDENT LIST SY2026-2027 (`156hsISrGNmL2Q-90BsEwhhZ0n6kWwdcZ_Dp15JVXl6A`). Do not put OpenApply's Student ID field in this column. `OA id` is the matched OpenApply record when one exists, and is blank when it does not. A row with `No.` and a blank `OA id` is the mismatch "Active in Weena's sheet but no OA record". `Grade` uses Weena's levels: Pre-K 2, Pre-K 3, Pre-K 4, KG, and Grade 1 through Grade 12. The local app also accepts `Pre K2`, `Gr 1`, and `G1`. `DOB` is `YYYY-MM-DD`. The weekday job and Sync Now refresh this tab through the bot webhook. The HTML file only reads the master sheet.

## Withdrawals

`Student ID`, `OA id`, `Name`, `Grade`, `Notified`, `Last day`, `Form signed`, `Reason`, `Category`, `Checklist`, `OA withdrawn`

`Category` is `Other School`, `Leaving Thailand`, `RIS Minburi`, `Relocation`, `Other`, or `Not stated`. Use `Not stated` when the family gave no reason. Do not leave `Reason` blank if you want the file to show that label; write `Not stated` in both `Reason` and `Category`.

## Alumni

`Alumni ID`, `Name`, `Graduating year`, `City`, `Country`, `University`, `Major`, `Consent`, `Offer country`

`Graduating year` is a four-digit year. `Consent` is `Yes` or `No`.

## Scholarships

`Student ID`, `Name`, `Grade`, `Register year`, `Discount type`, `% Discount`, `Scholarship end`, `Reviewed`, `Category`

`Category` is `Scholarship`, `Regular discount`, or `Admissions incentive`. Put the Finance list date in the Sync Log note, for example `Data as of 6 March 2026`.

## Sync Log

`At`, `Scope`, `Rows`, `Mode`, `Note`

`At` is an ISO timestamp. `Mode` is `live` or `sample`. One row per refresh.

## Snapshot (optional)

A tab named `Snapshot`. Cell A1 is `snapshot-v1`. Each following cell in column A is the next slice of a JSON document, at most 40,000 characters. Joined together, the slices are the full dashboard payload (badges, charts, gaps). When this tab is present and valid, the HTML file uses it instead of rebuilding charts from the columns above.

## No Show Log (optional)

`Timestamp (ICT)`, `Registration ID`, `Students`, `Action`, `Actor`, `Calendar event ID`, `ISO time`

`Action` is `No Show`, `OA updated`, or `Undo`.
