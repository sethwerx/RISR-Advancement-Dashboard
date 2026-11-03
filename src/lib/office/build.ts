import { scholarshipDataAsOf } from "@/config/sources";
import { categorizeWithdrawalReason } from "@/config/withdrawal-reasons";
import type { JoinedPerson, OfficeChart, OfficeGap, OfficeRow, OfficeSnapshot, OfficeTabId, OfficeTabPayload, SyncLogEntry } from "@/lib/office/types";

function nameOf(person: JoinedPerson): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

function field(person: JoinedPerson, key: string): string {
  return person.fields[key] ?? "";
}

function badges(person: JoinedPerson, extra: string[] = []): string[] {
  const list = [...extra];
  if (person.confidence === "low") list.push("Low confidence");
  if (field(person, "loa") === "yes") list.push("LOA");
  return list;
}

function row(person: JoinedPerson, cells: Record<string, string>, extraDetail: { label: string; value: string }[] = [], extraBadges: string[] = []): OfficeRow {
  const detail = [
    { label: "Match", value: person.confidence === "low" ? "Name only (low confidence)" : person.match },
    { label: "Sources", value: person.sources.join(", ") },
    ...extraDetail,
    ...Object.entries(cells).map(([label, value]) => ({ label, value })),
  ].filter((item) => item.value);
  return {
    id: person.id,
    enrollmentYear: person.enrollmentYear,
    oaStatus: field(person, "oaStatus"),
    gradYear: numberOrUndefined(field(person, "gradYear")),
    cells,
    detail,
    badges: badges(person, extraBadges),
  };
}

function numberOrUndefined(value: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function chart(id: string, title: string, counts: Map<string, number>): OfficeChart {
  return {
    id,
    title,
    points: [...counts.entries()].map(([label, value]) => ({ label, value })),
  };
}

function countBy(rows: OfficeRow[], column: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of rows) {
    const label = item.cells[column] || "Not recorded";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return counts;
}

function tab(partial: Omit<OfficeTabPayload, "kpis"> & { kpis: OfficeTabPayload["kpis"] }): OfficeTabPayload {
  return partial;
}

export function applicantStage(person: JoinedPerson): string {
  const notion = field(person, "notionStatus");
  const oa = field(person, "oaStatus");
  if (oa === "applied" || /application submitted|application checked|file review/i.test(notion)) return "Applicant";
  if (/^potential/i.test(notion)) return notion;
  if (notion === "Family is Interested") return "Family is Interested";
  if (oa === "pending") return "Prospect/inquiry";
  return "";
}

export function assessmentState(person: JoinedPerson): string {
  const notion = field(person, "notionStatus");
  const tags = field(person, "tags");
  if (/need to re-assessed/i.test(notion) || /reassess/i.test(field(person, "assessmentResult"))) return "Reassess";
  if (/assessment done - waiting/i.test(notion) || /Assessment Done|Assessed/.test(tags)) return "Done, awaiting result";
  if (/assessment scheduled/i.test(notion) || /Schedule Assessment|Assessment Scheduled/.test(tags)) return "Scheduled";
  if (field(person, "assessmentDate") || field(person, "assessmentType")) return "Scheduled";
  return "";
}

export function admittedStage(person: JoinedPerson): string {
  const oa = field(person, "oaStatus");
  if (oa === "enrolled") return "Admitted → Enrolled";
  if (oa === "admitted" || /^Admitted Y/i.test(field(person, "notionStatus"))) return "Admitted, not yet enrolled";
  return "";
}

export function declineCategory(person: JoinedPerson): string {
  const level = field(person, "statusLevel");
  const notion = `${field(person, "notionStatus")} ${field(person, "notionReason")}`;
  if (/family declined offer/i.test(level) || /family declined offer/i.test(notion)) return "Family declined offer";
  if (/family canceled application/i.test(level) || /not interested|cancelled but still interested|canceled/i.test(notion)) return "Family canceled application";
  if (/needs not compatible/i.test(level) || /needs not met/i.test(notion)) return "School declined (needs not met)";
  if (field(person, "oaStatus") === "declined") return "Other";
  return "";
}

export function deriveOffer(person: JoinedPerson): string {
  const tags = field(person, "tags");
  const decision = field(person, "enrollmentDecision");
  const level = field(person, "statusLevel");
  const notion = field(person, "notionStatus");
  if (/conditional/i.test(decision) || /Conditional - Academic/.test(tags)) return "Conditional";
  if (level === "Family Declined Offer") return "Offer declined";
  if (field(person, "oaStatus") === "enrolled" || level === "Seat Reserved Paid (50K)" || /seat reserved paid/i.test(field(person, "notionFee"))) {
    return "Offer accepted";
  }
  if (field(person, "admittedDate") || field(person, "letterOffered")) return "Offer made";
  if (/waiting for risr offer|file review/i.test(notion)) return "Offer pending";
  if (/Seat Reserved|Seat Reservation|Waiting for Deal/.test(tags)) return "Offer made";
  return "";
}

export function scholarshipCategory(type: string): string {
  const text = type.toLowerCase();
  if (!text) return "";
  if (/waived|open house|booth/.test(text)) return "Admissions incentive";
  if (/sibling|family|faculty|staff|teacher|myis|sisb|alumni|mou/.test(text)) return "Regular discount";
  if (/diversity|civic|ad astra|mfa|ambassador|hhh|need|financial aid/.test(text)) return "Scholarship";
  return "Scholarship";
}

function peopleRows(people: JoinedPerson[], include: (person: JoinedPerson) => boolean, make: (person: JoinedPerson) => OfficeRow): OfficeRow[] {
  return people.filter(include).map(make);
}

export function buildOfficeTabs(people: JoinedPerson[]): Record<OfficeTabId, OfficeTabPayload> {
  const applicants = peopleRows(
    people,
    (person) => Boolean(applicantStage(person)),
    (person) =>
      row(person, {
        Name: nameOf(person),
        "OA id": person.oaId ?? "",
        "Student ID": person.studentId ?? "",
        Grade: person.grade,
        "Enrollment year": person.enrollmentYear ? String(person.enrollmentYear) : "",
        Applied: field(person, "appliedDate"),
        Inquired: field(person, "inquiredDate"),
        Stage: applicantStage(person),
        Fee: field(person, "statusLevel") || field(person, "notionFee"),
        "Lead source": field(person, "lead") || field(person, "notionLead"),
        Nationality: field(person, "nationality"),
        Gender: field(person, "gender"),
        "Previous school": field(person, "previousSchool"),
      }),
  );
  const assessments = peopleRows(
    people,
    (person) => Boolean(assessmentState(person)),
    (person) =>
      row(person, {
        Name: nameOf(person),
        Grade: person.grade,
        "Enrollment year": person.enrollmentYear ? String(person.enrollmentYear) : "",
        "Assessment date": field(person, "assessmentDate"),
        Type: field(person, "assessmentType"),
        Result: field(person, "assessmentResult"),
        Decision: field(person, "enrollmentDecision"),
        Status: assessmentState(person),
        "ELD/LS": /ELD|LS Review/.test(field(person, "tags")) ? "Yes" : "",
      }),
  );
  const admitted = peopleRows(
    people,
    (person) => Boolean(admittedStage(person)),
    (person) =>
      row(person, {
        Name: nameOf(person),
        "OA id": person.oaId ?? "",
        Grade: person.grade,
        "Enrollment year": person.enrollmentYear ? String(person.enrollmentYear) : "",
        Admitted: field(person, "admittedDate"),
        Enrolled: field(person, "enrolledDate"),
        Stage: admittedStage(person),
        Invoice: field(person, "statusLevel"),
        "Fee paid": field(person, "notionFee"),
        "Start date": field(person, "startDate"),
        Payment: field(person, "paymentStatus"),
        Class: field(person, "classAssignment"),
      }),
  );
  const declined = peopleRows(
    people,
    (person) => field(person, "oaStatus") === "declined" || Boolean(declineCategory(person)),
    (person) =>
      row(person, {
        Name: nameOf(person),
        "OA id": person.oaId ?? "",
        Grade: person.grade,
        "Enrollment year": person.enrollmentYear ? String(person.enrollmentYear) : "",
        Declined: field(person, "declinedDate"),
        Reason: field(person, "statusLevel") || field(person, "notionReason"),
        Category: declineCategory(person),
        Tags: field(person, "tags"),
        "Notion reason": field(person, "notionReason"),
        "Previous school": field(person, "previousSchool"),
      }),
  );
  const offers = peopleRows(
    people,
    (person) => Boolean(deriveOffer(person)),
    (person) =>
      row(person, {
        Name: nameOf(person),
        Grade: person.grade,
        "Offer date": field(person, "admittedDate") || field(person, "letterOffered"),
        Decision: field(person, "enrollmentDecision"),
        Signatures: field(person, "signatures"),
        "Seat reservation": /Seat Reserved|Waiting for Deal/.test(field(person, "tags")) ? field(person, "tags") : field(person, "statusLevel"),
        Scholarship: field(person, "scholarshipType"),
        Outcome: deriveOffer(person),
      }),
  );
  const students = peopleRows(
    people,
    (person) => field(person, "onWeena") === "yes" || field(person, "oaStatus") === "enrolled" || field(person, "notionEnrollment") === "Active",
    (person) =>
        row(person, {
          "No.": field(person, "weenaNo"),
          "Student ID": person.studentId ?? "",
          "OA id": person.oaId ?? "",
          Name: nameOf(person),
          Grade: person.grade,
          Homeroom: field(person, "homeroom"),
          Gender: field(person, "gender"),
          Nationality: field(person, "nationality"),
          DOB: person.dob ?? "",
          "Start date": field(person, "startDate"),
          Status: field(person, "loa") === "yes" ? "LOA" : field(person, "weenaNo") ? "Active" : field(person, "oaStatus") || field(person, "notionEnrollment"),
          Scholarship: field(person, "scholarshipType"),
          Sibling: field(person, "sibling") === "yes" ? "Yes" : "",
        }),
  );
  const withdrawals = peopleRows(
    people,
    (person) => Boolean(field(person, "withdrawalReason") || field(person, "withdrawnDate")),
    (person) => {
      const onList = field(person, "onWeena") === "yes";
      const reason = field(person, "withdrawalReason");
      if (onList && field(person, "loa") === "yes") return row(person, { Name: "" });
      return row(person, {
        "Student ID": person.studentId ?? "",
        "OA id": person.oaId ?? "",
        Name: nameOf(person),
        Grade: person.grade,
        Notified: field(person, "notifiedDate"),
        "Last day": field(person, "lastDay"),
        "Form signed": field(person, "formSigned"),
        Reason: reason,
        Category: categorizeWithdrawalReason(reason),
        Checklist: field(person, "checklist"),
        "OA withdrawn": field(person, "withdrawnDate"),
      });
    },
  ).filter((item) => item.cells.Name);
  const alumni = peopleRows(
    people,
    (person) => field(person, "oaStatus") === "graduated" || Boolean(field(person, "gradYear")),
    (person) =>
      row(person, {
        "Alumni ID": field(person, "alumniId"),
        Name: nameOf(person),
        "Graduating year": field(person, "gradYear"),
        City: field(person, "city"),
        Country: field(person, "country"),
        University: field(person, "university"),
        Major: field(person, "major"),
        Consent: field(person, "consent"),
        "Offer country": field(person, "offerCountry"),
      }),
  );
  const scholarships = peopleRows(
    people,
    (person) => Boolean(field(person, "discountType") || field(person, "scholarshipType")),
    (person) =>
      row(person, {
        "Student ID": person.studentId ?? "",
        Name: nameOf(person),
        Grade: person.grade,
        "Register year": field(person, "registerYear"),
        "Discount type": field(person, "discountType") || field(person, "scholarshipType"),
        "% Discount": field(person, "discountPercent"),
        "Scholarship end": field(person, "scholarshipEnd"),
        Reviewed: field(person, "scholarshipReviewed"),
        Category: scholarshipCategory(field(person, "discountType") || field(person, "scholarshipType")),
      }),
  );

  const weenaActive = people.filter((person) => field(person, "weenaNo")).length;
  const oaEnrolled = people.filter((person) => field(person, "oaStatus") === "enrolled").length;
  const notionActive = people.filter((person) => field(person, "notionEnrollment") === "Active").length;
  const mismatches = people.flatMap((person) => {
    const issues: string[] = [];
    if (field(person, "oaStatus") === "enrolled" && field(person, "onWeena") !== "yes") issues.push("OA enrolled, missing on the Weena list");
    if (field(person, "weenaNo") && field(person, "oaStatus") !== "enrolled" && field(person, "loa") !== "yes") issues.push("Numbered on the Weena list, not OA enrolled");
    if (field(person, "notionEnrollment") === "Active" && !field(person, "weenaNo")) issues.push("Notion Active, missing a Weena No.");
    return issues.map((issue) => ({ name: nameOf(person), issue }));
  });

  const missingYear = people.filter((person) => person.sources.includes("notion-pipeline") && person.enrollmentYear == null).length;
  const notionUnlinked = people.filter((person) => person.sources.includes("notion-pipeline") && !person.oaId).length;
  const missingReasons = declined.filter((item) => !item.cells.Reason).length;
  const missingAssessmentDates = assessments.filter((item) => !item.cells["Assessment date"]).length;

  return {
    applicants: tab({
      id: "applicants",
      title: "Applicants",
      columns: ["Name", "OA id", "Student ID", "Grade", "Enrollment year", "Applied", "Inquired", "Stage", "Fee", "Lead source", "Nationality", "Gender", "Previous school"],
      rows: applicants,
      kpis: [
        { id: "count", label: "In view", value: String(applicants.length), chartId: "by-stage" },
        { id: "applied", label: "Applicants", value: String(applicants.filter((item) => item.cells.Stage === "Applicant").length), chartId: "by-year" },
        { id: "fee", label: "Fee paid", value: String(applicants.filter((item) => /fee paid/i.test(item.cells.Fee)).length), chartId: "by-stage" },
      ],
      charts: [chart("by-stage", "Applicants by stage", countBy(applicants, "Stage")), chart("by-year", "Applicants by enrollment year", countBy(applicants, "Enrollment year")), chart("by-source", "Applicants by lead source", countBy(applicants, "Lead source"))],
      gaps: [
        { label: "Missing Enrollment Year", detail: `${missingYear} Notion pipeline records have no enrollment year.` },
        { label: "Notion rows without an OA link", detail: `${notionUnlinked} pipeline records have no OA id.` },
      ],
    }),
    assessments: tab({
      id: "assessments",
      title: "Assessments",
      columns: ["Name", "Grade", "Enrollment year", "Assessment date", "Type", "Result", "Decision", "Status", "ELD/LS"],
      rows: assessments,
      kpis: [
        { id: "scheduled", label: "Scheduled", value: String(assessments.filter((item) => item.cells.Status === "Scheduled").length), chartId: "by-status" },
        { id: "done", label: "Done, awaiting result", value: String(assessments.filter((item) => item.cells.Status === "Done, awaiting result").length), chartId: "by-status" },
        { id: "support", label: "ELD/LS", value: String(assessments.filter((item) => item.cells["ELD/LS"] === "Yes").length), chartId: "by-result" },
      ],
      charts: [chart("by-status", "Scheduled vs done", countBy(assessments, "Status")), chart("by-result", "Result bands", countBy(assessments, "Result"))],
      gaps: [
        { label: "OA assessment fields are empty", detail: "Assessment detail comes from Notion status and OA tags, not the empty OA assessment custom fields." },
        { label: "Missing assessment dates", detail: `${missingAssessmentDates} assessment rows have no date.` },
      ],
    }),
    admitted: tab({
      id: "admitted",
      title: "Admitted",
      columns: ["Name", "OA id", "Grade", "Enrollment year", "Admitted", "Enrolled", "Stage", "Invoice", "Fee paid", "Start date", "Payment", "Class"],
      rows: admitted,
      kpis: [
        { id: "admits", label: "Admitted", value: String(admitted.filter((item) => item.cells.Stage === "Admitted, not yet enrolled").length), chartId: "by-stage" },
        { id: "enrolled", label: "Enrolled", value: String(admitted.filter((item) => item.cells.Stage === "Admitted → Enrolled").length), chartId: "by-stage" },
        { id: "paid", label: "Invoice paid", value: String(admitted.filter((item) => /invoice paid/i.test(item.cells.Invoice)).length), chartId: "by-year" },
      ],
      charts: [chart("by-stage", "Admit to enroll", countBy(admitted, "Stage")), chart("by-year", "Admits by enrollment year", countBy(admitted, "Enrollment year"))],
      gaps: [{ label: "Tracking sheet has no Student ID", detail: "New-student tracking rows join on name and grade or name and date of birth." }],
    }),
    "canceled-declined": tab({
      id: "canceled-declined",
      title: "Canceled/Declined",
      columns: ["Name", "OA id", "Grade", "Enrollment year", "Declined", "Reason", "Category", "Tags", "Notion reason", "Previous school"],
      rows: declined,
      kpis: [
        { id: "family", label: "Family", value: String(declined.filter((item) => item.cells.Category.startsWith("Family")).length), chartId: "by-category" },
        { id: "school", label: "School declined", value: String(declined.filter((item) => item.cells.Category.startsWith("School")).length), chartId: "by-category" },
        { id: "blank", label: "No reason", value: String(missingReasons), chartId: "by-category" },
      ],
      charts: [chart("by-category", "Declines by category", countBy(declined, "Category")), chart("by-year", "Declines by enrollment year", countBy(declined, "Enrollment year"))],
      gaps: [{ label: "Missing reasons", detail: `${missingReasons} declined rows have no OA status level and no Notion reason.` }],
    }),
    offers: tab({
      id: "offers",
      title: "Offers",
      columns: ["Name", "Grade", "Offer date", "Decision", "Signatures", "Seat reservation", "Scholarship", "Outcome"],
      rows: offers,
      kpis: [
        { id: "made", label: "Offer made", value: String(offers.filter((item) => item.cells.Outcome === "Offer made").length), chartId: "by-outcome" },
        { id: "accepted", label: "Accepted", value: String(offers.filter((item) => item.cells.Outcome === "Offer accepted").length), chartId: "by-outcome" },
        { id: "declined", label: "Declined", value: String(offers.filter((item) => item.cells.Outcome === "Offer declined").length), chartId: "by-outcome" },
      ],
      charts: [chart("by-outcome", "Offers by outcome", countBy(offers, "Outcome"))],
      gaps: [{ label: "Offers are derived", detail: "OA has no offer field. Outcomes come from admitted date, seat-reservation tags, and status level. Notion Enrollment Decision is often blank." }],
    }),
    "student-list": tab({
      id: "student-list",
      title: "Student List",
      columns: ["No.", "Student ID", "OA id", "Name", "Grade", "Homeroom", "Gender", "Nationality", "DOB", "Start date", "Status", "Scholarship", "Sibling"],
      rows: students,
      kpis: [
        { id: "active", label: "Active (has No.)", value: String(students.filter((item) => item.cells["No."]).length), chartId: "by-grade" },
        { id: "loa", label: "LOA", value: String(students.filter((item) => item.badges.includes("LOA")).length), chartId: "by-status" },
        { id: "new", label: "With a start date", value: String(students.filter((item) => item.cells["Start date"]).length), chartId: "by-grade" },
      ],
      charts: [chart("by-grade", "Headcount by grade", countBy(students, "Grade")), chart("by-status", "Status", countBy(students, "Status"))],
      gaps: [{ label: "No Notion Student List for 2026-27", detail: "The Notion roster is the 2025/26 database. The current numbered list is Weena's SY2026-2027 sheet." }],
      reconciliation: [
        { label: "Weena (has No.)", count: weenaActive },
        { label: "OA enrolled", count: oaEnrolled },
        { label: "Notion Active", count: notionActive },
      ],
      mismatches,
    }),
    withdrawals: tab({
      id: "withdrawals",
      title: "Withdrawals",
      columns: ["Student ID", "OA id", "Name", "Grade", "Notified", "Last day", "Form signed", "Reason", "Category", "Checklist", "OA withdrawn"],
      rows: withdrawals,
      kpis: [
        { id: "count", label: "Withdrawals", value: String(withdrawals.length), chartId: "by-reason" },
        { id: "other", label: "Unmapped reason", value: String(withdrawals.filter((item) => item.cells.Category === "Other").length), chartId: "by-reason" },
      ],
      charts: [chart("by-reason", "Reasons by category", countBy(withdrawals, "Category")), chart("by-year", "Withdrawals by enrollment year", countBy(withdrawals, "Grade"))],
      gaps: [
        { label: "Free-text reasons", detail: "Parent reasons are categorized through the editable mapping config. Unmatched text stays Other." },
        { label: "SY2026-2027 sheet is stale", detail: "The current-year withdrawal sheet was last updated in April 2026." },
      ],
    }),
    alumni: tab({
      id: "alumni",
      title: "Alumni",
      columns: ["Alumni ID", "Name", "Graduating year", "City", "Country", "University", "Major", "Consent", "Offer country"],
      rows: alumni,
      kpis: [
        { id: "count", label: "Alumni", value: String(alumni.length), chartId: "by-year" },
        { id: "consent", label: "Consent yes", value: String(alumni.filter((item) => /yes/i.test(item.cells.Consent)).length), chartId: "by-country" },
      ],
      charts: [chart("by-year", "Alumni by graduating year", countBy(alumni, "Graduating year")), chart("by-country", "Offer countries", countBy(alumni, "Offer country"))],
      gaps: [{ label: "Class coverage", detail: "The latest alumni database copy is the source of truth. Older copies are not merged in." }],
    }),
    scholarships: tab({
      id: "scholarships",
      title: "Scholarships",
      columns: ["Student ID", "Name", "Grade", "Register year", "Discount type", "% Discount", "Scholarship end", "Reviewed", "Category"],
      rows: scholarships,
      kpis: [
        { id: "count", label: "Discounted", value: String(scholarships.length), chartId: "by-category" },
        { id: "award", label: "Scholarship", value: String(scholarships.filter((item) => item.cells.Category === "Scholarship").length), chartId: "by-category" },
        { id: "regular", label: "Regular discount", value: String(scholarships.filter((item) => item.cells.Category === "Regular discount").length), chartId: "by-type" },
      ],
      charts: [chart("by-category", "Scholarship vs regular", countBy(scholarships, "Category")), chart("by-type", "Discount type", countBy(scholarships, "Discount type"))],
      gaps: [{ label: "Type labels differ by source", detail: "Finance, Notion, and OA tags use different names. Categories come from a mapping table." }],
      note: `Data as of ${scholarshipDataAsOf} (Finance scholarship list).`,
    }),
  };
}

export function buildSnapshot(people: JoinedPerson[], options: { mock: boolean; at?: string; log?: SyncLogEntry[] } = { mock: true }): OfficeSnapshot {
  const tabs = buildOfficeTabs(people);
  const rows = Object.values(tabs).reduce((sum, item) => sum + item.rows.length, 0);
  const at = options.at ?? new Date().toISOString();
  return {
    generatedAt: at,
    mock: options.mock,
    tabs,
    syncLog: options.log ?? [
      {
        at,
        scope: "all tabs",
        rows,
        mode: options.mock ? "sample" : "live",
        note: options.mock ? "Fictional sample snapshot. Master sheet was not written." : "Live snapshot written to the master sheet.",
      },
    ],
  };
}

export function snapshotGrids(snapshot: OfficeSnapshot): { title: string; values: string[][] }[] {
  const titles: Record<OfficeTabId, string> = {
    applicants: "Applicants",
    assessments: "Assessments",
    admitted: "Admitted",
    "canceled-declined": "Canceled/Declined",
    offers: "Offers",
    "student-list": "Student List",
    withdrawals: "Withdrawals",
    alumni: "Alumni",
    scholarships: "Scholarships",
  };
  const grids = (Object.keys(titles) as OfficeTabId[]).map((id) => {
    const payload = snapshot.tabs[id];
    return {
      title: titles[id],
      values: [payload.columns, ...payload.rows.map((item) => payload.columns.map((column) => item.cells[column] ?? ""))],
    };
  });
  grids.push({
    title: "Sync Log",
    values: [
      ["At", "Scope", "Rows", "Mode", "Note"],
      ...snapshot.syncLog.map((entry) => [entry.at, entry.scope, String(entry.rows), entry.mode, entry.note]),
    ],
  });
  return grids;
}
