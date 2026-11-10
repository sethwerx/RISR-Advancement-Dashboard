import { buildSnapshot } from "@/lib/office/build";
import { joinPeople } from "@/lib/office/join";
import type { OfficeSnapshot, SourcePart } from "@/lib/office/types";

/**
 * Fictional families used when credentials are missing.
 * Names, dates, and 90000-range ids are made up. They are not school records.
 */
function part(source: string, firstName: string, lastName: string, fields: Record<string, string>, extra: Partial<SourcePart> = {}): SourcePart {
  return { source, firstName, lastName, fields, ...extra };
}

export function fictionalParts(): SourcePart[] {
  return [
    part("oa", "Kiran", "Desai", { oaStatus: "pending", inquiredDate: "2024-09-02", nationality: "India", gender: "F", tags: "Open House", lead: "Open House" }, { oaId: "81001", studentId: "90001", dob: "2016-04-12", grade: "G5", enrollmentYear: 2024 }),
    part("notion-pipeline", "Kiran", "Desai", { notionStatus: "Inquiry", notionLead: "Walk In" }, { oaId: "https://risr.openapply.com/admin/students/81001", dob: "2016-04-12", grade: "G5" }),
    part("oa", "Lina", "Moreau", { oaStatus: "applied", appliedDate: "2026-01-14", inquiredDate: "2025-11-02", statusLevel: "Application Fee Paid", nationality: "France", gender: "F", lead: "Open Day", tags: "Open Day" }, { oaId: "81002", studentId: "90002", dob: "2019-08-01", grade: "G1", enrollmentYear: 2026 }),
    part("notion-pipeline", "Lina", "Moreau", { notionStatus: "Application Submitted", notionFee: "App fee 5K", notionEnrollmentYear: "2026/27" }, { oaId: "81002", studentId: "90002", dob: "2019-08-01", grade: "G1", enrollmentYear: 2026 }),
    part("oa", "Theo", "Nakamura", { oaStatus: "pending", inquiredDate: "2022-03-19", nationality: "Japan", gender: "M" }, { oaId: "81003", studentId: "90003", dob: "2014-01-20", grade: "G7", enrollmentYear: 2022 }),
    part("oa", "Amara", "Diallo", { oaStatus: "admitted", admittedDate: "2026-02-11", statusLevel: "Invoiced", tags: "Seat Reserved", nationality: "Senegal", gender: "F" }, { oaId: "81004", studentId: "90004", dob: "2017-06-06", grade: "G4", enrollmentYear: 2026 }),
    part("tracking", "Amara", "Diallo", { startDate: "2026-08-12", paymentStatus: "Deposit received", classAssignment: "G4 Homeroom B", financeCondition: "Standard" }, { dob: "2017-06-06", grade: "G4", enrollmentYear: 2026 }),
    part("oa", "Owen", "Hart", { oaStatus: "declined", declinedDate: "2026-02-20", nationality: "UK", gender: "M", previousSchool: "Northbridge" }, { oaId: "81005", studentId: "90005", dob: "2011-12-01", grade: "G9", enrollmentYear: 2026 }),
    part("oa", "Sara", "Lindqvist", { oaStatus: "declined", declinedDate: "2026-01-20", statusLevel: "Family Declined Offer", tags: "Applied to Wrong Campus", nationality: "Sweden", gender: "F" }, { oaId: "81006", dob: "2018-02-14", grade: "G2", enrollmentYear: 2026 }),
    part("notion-pipeline", "Sara", "Lindqvist", { notionStatus: "Family Declined Offer", notionReason: "Offer Not Appealing" }, { oaId: "81006", dob: "2018-02-14", grade: "G2", enrollmentYear: 2026 }),
    part("oa", "Yusuf", "Demir", { oaStatus: "enrolled", enrolledDate: "2026-08-01", admittedDate: "2026-03-04", statusLevel: "Active Student", nationality: "Turkey", gender: "M", sibling: "yes" }, { oaId: "81007", studentId: "11111", dob: "2015-05-05", grade: "G6", enrollmentYear: 2026 }),
    part("weena", "Yusuf", "Demir", { onWeena: "yes", weenaNo: "14", homeroom: "6B", startDate: "2026-08-10" }, { studentId: "90007", dob: "2015-05-05", grade: "G6", enrollmentYear: 2026 }),
    part("notion-students", "Yusuf", "Demir", { notionEnrollment: "Active", scholarshipType: "Diversity 30%" }, { studentId: "90007", dob: "2015-05-05", grade: "G6" }),
    part("oa", "Chloe", "Nguyen", { oaStatus: "enrolled", enrolledDate: "2026-08-01", admittedDate: "2026-01-28", statusLevel: "Invoice Paid", nationality: "Vietnam", gender: "F" }, { oaId: "81008", studentId: "90008", dob: "2016-09-09", grade: "G4", enrollmentYear: 2026 }),
    part("weena", "Isla", "Rahman", { onWeena: "yes", weenaNo: "8", loa: "yes", homeroom: "8A" }, { studentId: "90009", dob: "2012-07-07", grade: "G8", enrollmentYear: 2026 }),
    part("oa", "Isla", "Rahman", { oaStatus: "withdrawn", withdrawnDate: "2026-01-09", tags: "ELD - Monitor" }, { oaId: "81009", studentId: "90009", dob: "2012-07-07", grade: "G8", enrollmentYear: 2026 }),
    part("weena", "Ben", "Rahman", { onWeena: "yes", weenaNo: "3", homeroom: "2A", startDate: "2026-08-10" }, { studentId: "90010", dob: "2018-11-11", grade: "G2", enrollmentYear: 2026 }),
    part("withdrawal", "Nora", "Petrov", { withdrawalReason: "Moving to another school in Bangkok", notifiedDate: "2026-01-04", lastDay: "2026-01-09", formSigned: "2026-01-08", checklist: "IT disabled; PowerSchool marked" }, { studentId: "90011", dob: "2009-03-03", grade: "G11", enrollmentYear: 2026 }),
    part("oa", "Nora", "Petrov", { oaStatus: "withdrawn", withdrawnDate: "2026-01-09" }, { oaId: "81011", studentId: "90011", dob: "2009-03-03", grade: "G11", enrollmentYear: 2026 }),
    part("withdrawal", "Kenji", "Watanabe", { withdrawalReason: "Leaving Thailand", notifiedDate: "2025-11-01", lastDay: "2025-11-21" }, { studentId: "90012", dob: "2013-10-10", grade: "G7", enrollmentYear: 2025 }),
    part("withdrawal", "Hugo", "Pereira", { withdrawalReason: "Personal", notifiedDate: "2026-02-01", lastDay: "2026-02-27" }, { studentId: "90013", dob: "2012-12-12", grade: "G8", enrollmentYear: 2026 }),
    part("oa", "Elena", "Rossi", { oaStatus: "graduated", nationality: "Italy", gender: "F" }, { oaId: "81014", dob: "2008-01-15", grade: "G12", enrollmentYear: 2026 }),
    part("alumni", "Elena", "Rossi", { gradYear: "2026", alumniId: "26007", city: "Bangkok", country: "Thailand", university: "Chulalongkorn University", major: "Economics", consent: "Yes", offerCountry: "Thailand" }, { dob: "2008-01-15", grade: "G12" }),
    part("alumni", "Elena", "Rossi", { offerCountry: "United States", university: "Boston University" }, { dob: "2008-01-15" }),
    part("oa", "Noah", "Kim", { oaStatus: "graduated" }, { oaId: "81018", grade: "G12", enrollmentYear: 2026 }),
    part("alumni", "Noah", "Kim", { gradYear: "2026", alumniId: "26008", consent: "No", country: "Korea", university: "KAIST", offerCountry: "Korea" }, {}),
    part("notion-pipeline", "Priya", "Nair", { notionStatus: "Assessment Scheduled", assessmentType: "MAP Reading", notionLead: "Calls" }, { grade: "G3", enrollmentYear: 2026 }),
    part("oa", "Priya", "Nair", { oaStatus: "applied", appliedDate: "2026-02-02", tags: "Schedule Assessment", statusLevel: "Open House (Application Fee Waived)", lead: "Open House" }, { oaId: "81015", studentId: "90015", dob: "2017-04-04", grade: "G3", enrollmentYear: 2026 }),
    part("notion-pipeline", "Mateo", "Alvarez", { notionStatus: "Assessment Done - Waiting for Results", assessmentDate: "2026-02-18", assessmentType: "WIDA", assessmentResult: "Approaching", enrollmentDecision: "" }, { oaId: "81016", dob: "2010-06-16", grade: "G8", enrollmentYear: 2026 }),
    part("oa", "Mateo", "Alvarez", { oaStatus: "applied", tags: "Assessment Done, ELD - Newcomer", statusLevel: "Seat Reserved Paid (50K)" }, { oaId: "81016", studentId: "90016", dob: "2010-06-16", grade: "G8", enrollmentYear: 2026 }),
    part("notion-pipeline", "Hana", "Sato", { notionStatus: "Waiting for RISR Offer" }, { grade: "G5" }),
    part("finance", "Yusuf", "Demir", { discountType: "Diversity -30%", discountPercent: "30%", registerYear: "2026", scholarshipEnd: "2028", scholarshipReviewed: "Yes" }, { studentId: "90007", dob: "2015-05-05", grade: "G6", enrollmentYear: 2026 }),
    part("finance", "Ben", "Rahman", { discountType: "Sibling", discountPercent: "10%", registerYear: "2024", scholarshipReviewed: "No" }, { studentId: "90010", grade: "G2", enrollmentYear: 2026 }),
    part("oa", "Noor", "Hassan", { oaStatus: "admitted", admittedDate: "2026-03-01", tags: "Conditional - Academic", statusLevel: "" }, { oaId: "81017", studentId: "22222", dob: "2015-02-02", grade: "G6", enrollmentYear: 2026 }),
    part("oa", "Nia", "Okonkwo", { oaStatus: "declined", declinedDate: "2026-03-01", statusLevel: "Needs Not Compatible - LS", nationality: "Nigeria", gender: "F" }, { oaId: "81019", dob: "2016-03-03", grade: "G4", enrollmentYear: 2026 }),
    part("tracking", "Lila", "Berg", { startDate: "2026-08-01", paymentStatus: "Offer sent", classAssignment: "G2" }, { dob: "2018-08-08", grade: "G2", enrollmentYear: 2026 }),
    part("withdrawal", "Sami", "Iqbal", { withdrawalReason: "" }, { studentId: "90019", dob: "2011-01-01", grade: "G9", enrollmentYear: 2026 }),
  ];
}

export function fictionalSnapshot(at = "2026-11-03T05:55:00.000Z"): OfficeSnapshot {
  return buildSnapshot(joinPeople(fictionalParts()), { mock: true, at });
}
