import { extractOaId, normalizeStudentId } from "@/lib/office/join";
import type { SourcePart } from "@/lib/office/types";

export type OaStudentJson = {
  id?: number;
  student_id?: string | number | null;
  custom_id?: string | number | null;
  first_name?: string | null;
  last_name?: string | null;
  grade?: string | null;
  enrollment_grade?: string | null;
  enrollment_year?: number | string | null;
  status?: string | null;
  status_level?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  tags?: string[] | { name?: string }[] | null;
  inquired_date?: string | null;
  applied_date?: string | null;
  admitted_date?: string | null;
  enrolled_date?: string | null;
  declined_date?: string | null;
  withdrawn_date?: string | null;
  graduated_date?: string | null;
  custom_fields?: { key?: string; value?: string | null }[] | Record<string, string | null> | null;
};

function customField(student: OaStudentJson, key: string): string {
  const fields = student.custom_fields;
  if (!fields) return "";
  if (Array.isArray(fields)) return fields.find((item) => item.key === key)?.value ?? "";
  return fields[key] ?? "";
}

function tagText(tags: OaStudentJson["tags"]): string {
  if (!tags) return "";
  return tags
    .map((tag) => (typeof tag === "string" ? tag : tag.name ?? ""))
    .filter(Boolean)
    .join(", ");
}

export function parseOaStudents(payload: { students?: OaStudentJson[] } | OaStudentJson[]): SourcePart[] {
  const students = Array.isArray(payload) ? payload : payload.students ?? [];
  return students.map((student) => {
    const year = Number(student.enrollment_year);
    return {
      source: "oa",
      oaId: student.id != null ? String(student.id) : undefined,
      firstName: student.first_name ?? "",
      lastName: student.last_name ?? "",
      dob: student.birth_date ?? undefined,
      grade: student.enrollment_grade || student.grade || "",
      enrollmentYear: Number.isFinite(year) ? year : undefined,
      fields: {
        oaStatus: student.status ?? "",
        statusLevel: student.status_level ?? "",
        gender: student.gender ?? "",
        nationality: customField(student, "nationality"),
        previousSchool: customField(student, "previous_schools"),
        tags: tagText(student.tags),
        inquiredDate: student.inquired_date ?? "",
        appliedDate: student.applied_date ?? "",
        admittedDate: student.admitted_date ?? "",
        enrolledDate: student.enrolled_date ?? "",
        declinedDate: student.declined_date ?? "",
        withdrawnDate: student.withdrawn_date ?? "",
        graduatedDate: student.graduated_date ?? "",
      },
    };
  });
}

type NotionProperty = {
  type?: string;
  title?: { plain_text?: string }[];
  rich_text?: { plain_text?: string }[];
  select?: { name?: string } | null;
  status?: { name?: string } | null;
  multi_select?: { name?: string }[];
  date?: { start?: string } | null;
  url?: string | null;
  number?: number | null;
  checkbox?: boolean;
};

export type NotionPage = {
  properties?: Record<string, NotionProperty>;
};

function notionText(property: NotionProperty | undefined): string {
  if (!property) return "";
  if (property.type === "title") return (property.title ?? []).map((item) => item.plain_text ?? "").join("");
  if (property.type === "rich_text") return (property.rich_text ?? []).map((item) => item.plain_text ?? "").join("");
  if (property.type === "select") return property.select?.name ?? "";
  if (property.type === "status") return property.status?.name ?? "";
  if (property.type === "multi_select") return (property.multi_select ?? []).map((item) => item.name ?? "").filter(Boolean).join(", ");
  if (property.type === "date") return property.date?.start ?? "";
  if (property.type === "url") return property.url ?? "";
  if (property.type === "number") return property.number == null ? "" : String(property.number);
  if (property.type === "checkbox") return property.checkbox ? "Yes" : "";
  return "";
}

function splitName(title: string): { firstName: string; lastName: string } {
  const parts = title.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function parseNotionPages(pages: NotionPage[], source: string): SourcePart[] {
  return pages.map((page) => {
    const properties = page.properties ?? {};
    const title = notionText(properties["Student Name"]) || notionText(properties.Name);
    const explicitFirst = notionText(properties["First Name"]);
    const explicitLast = notionText(properties["Last Name"]);
    const split = splitName(title);
    const profile = notionText(properties["OA Profile"]);
    const yearText = notionText(properties["Enrollment Year"]);
    const yearMatch = yearText.match(/(20\d{2})/);
    return {
      source,
      oaId: extractOaId(profile),
      studentId: normalizeStudentId(notionText(properties["Student ID"]) || notionText(properties["ID Number"])),
      firstName: explicitFirst || split.firstName,
      lastName: explicitLast || split.lastName,
      dob: notionText(properties["Birth Date"]) || notionText(properties["Date of Birth"]) || undefined,
      grade: notionText(properties["Grade Applying For"]) || notionText(properties["Grade Level"]) || "",
      enrollmentYear: yearMatch ? Number(yearMatch[1]) : undefined,
      fields: {
        notionStatus: notionText(properties.Status) || notionText(properties["Retention Status"]) || notionText(properties["Enrollment Status"]),
        notionReason: notionText(properties["Status Reason"]),
        notionLead: notionText(properties["Lead Type"]),
        notionFee: notionText(properties["Fee Paid 1"]) || notionText(properties["Fee Paid 2"]),
        notionEnrollment: notionText(properties["Enrollment Status"]),
        assessmentDate: notionText(properties["Assessment Date"]),
        assessmentType: [notionText(properties["Assessment Type 1"]), notionText(properties["Assessment Type 2"])].filter(Boolean).join(", "),
        assessmentResult: notionText(properties["Assessment Result"]),
        enrollmentDecision: notionText(properties["Enrollment Decision"]),
        letterOffered: notionText(properties["Enrollment Letter Offered"]),
        scholarshipType: notionText(properties["Scholarship Type"]),
        homeroom: notionText(properties.Homeroom),
      },
    };
  });
}

export function parseSheetTable(values: string[][], source: string, headerNeedles: string[]): SourcePart[] {
  const headerIndex = values.findIndex((row) => headerNeedles.every((needle) => row.some((cell) => cell.trim().toLowerCase() === needle.toLowerCase())));
  if (headerIndex < 0) return [];
  const header = values[headerIndex].map((cell) => cell.trim());
  const records: SourcePart[] = [];
  for (const raw of values.slice(headerIndex + 1)) {
    if (raw.every((cell) => !cell?.trim())) continue;
    const read = (name: string) => {
      const index = header.findIndex((cell) => cell.toLowerCase() === name.toLowerCase());
      return index >= 0 ? (raw[index] ?? "").trim() : "";
    };
    const firstName = read("First Name") || read("Name").split(/\s+/)[0] || "";
    const lastName = read("Surname") || read("Last Name") || read("Name").split(/\s+/).slice(1).join(" ");
    if (!firstName && !lastName) continue;
    const dob = read("DOB (mm/dd/year)") || read("DOB");
    records.push({
      source,
      studentId: normalizeStudentId(read("ID No.") || read("ID") || read("Student ID")),
      firstName,
      lastName,
      dob: dob || undefined,
      grade: read("Grade") || read("Grade Level SY2025-2026") || read("Grade Level"),
      fields: {
        onWeena: read("No.") ? "yes" : "",
        weenaNo: read("No."),
        startDate: read("Start Date"),
        hasWithdrawal: source === "withdrawal" ? "yes" : "",
        withdrawalReason: read("Reason Stated by Parents"),
        notifiedDate: read("Notified Date"),
        lastDay: read("Last day of School"),
        formSigned: read("Withdrawal form signed off date"),
        discountType: read("Discount Type"),
        discountPercent: read("% Discount"),
        registerYear: read("Register Year"),
        scholarshipEnd: read("Scholarship end"),
        scholarshipReviewed: read("Scholarship reviewed"),
        paymentStatus: read("Finance remarks Payment status"),
        classAssignment: read("Class assignment"),
        gradYear: read("Graduating Year"),
        alumniId: read("Alumni ID"),
        city: read("City"),
        country: read("Country") || read("Chosen Country"),
        university: read("Chosen University") || read("University"),
        major: read("Chosen Major") || read("Major / Program"),
        consent: read("Consent"),
      },
    });
  }
  return records;
}
