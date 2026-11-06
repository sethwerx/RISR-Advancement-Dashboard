/**
 * Walk-in booking fields inferred from OpenApply tour registrations.
 * Labels and options are inferred, so edit this list when the office corrects them.
 * The form renders only what is declared here. Time slots last 120 minutes.
 */
export type WalkInFieldType = "text" | "email" | "tel" | "date" | "textarea" | "select" | "multiselect" | "number";

export type WalkInField = {
  name: string;
  label: string;
  type: WalkInFieldType;
  required?: boolean;
  options?: string[] | null;
  /** Where the label and choices were inferred from. */
  source: string;
  section: "Tour" | "Child" | "Parent";
};

export const walkInDurationMinutes = 120;

/** Keys the calendar title, time, and sheet row read. Point these at the field names above. */
export const walkInBindings = {
  eventId: "event_id",
  date: "date",
  time: "time",
  attendees: "attendees_count",
  host: "host",
  campus: "campus",
  note: "note",
  studentFirstName: "student.first_name",
  studentLastName: "student.last_name",
  studentNickname: "student.custom_fields.thai_nickname",
  birthDate: "student.birth_date",
  grade: "student.grade",
  hearAbout: "student.custom_fields.referral_source_custom",
  parentFirstName: "parent.first_name",
  parentLastName: "parent.last_name",
  email: "parent.email",
  phone: "parent.custom_fields.mobile_phone",
  parentRole: "parent.parent_role",
} as const;

export const walkInFormFields: WalkInField[] = [
  { name: "event_id", label: "Tour type", type: "select", required: true, options: ["22964 Tour for PreK or KG Program", "22965 Tour for Elementary, Middle or High School Program", "24622 Tour for All Grade Levels (School Break)"], source: "API: event + registration.event_id", section: "Tour" },
  { name: "date", label: "Tour date", type: "date", required: true, options: null, source: "API: registration.date", section: "Tour" },
  { name: "time", label: "Time slot", type: "select", required: true, options: ["08:00 AM", "10:00 AM"], source: "API: event.hours + registration.time", section: "Tour" },
  { name: "attendees_count", label: "Number of attendees", type: "number", required: true, options: null, source: "API: registration.attendees_count", section: "Tour" },
  { name: "host", label: "Host (staff)", type: "text", required: false, options: null, source: "API: registration.host (staff-assigned, not parent-entered)", section: "Tour" },
  { name: "campus", label: "Campus", type: "select", required: true, options: ["Ruamrudee International School, Ratchapruek Campus"], source: "API: registration.campus", section: "Tour" },
  { name: "note", label: "Notes", type: "textarea", required: false, options: null, source: "API: registration.note (mostly staff HTML notes)", section: "Tour" },
  { name: "student.first_name", label: "Child first name", type: "text", required: true, options: null, source: "inferred: student record", section: "Child" },
  { name: "student.last_name", label: "Child last name", type: "text", required: true, options: null, source: "inferred: student record", section: "Child" },
  { name: "student.birth_date", label: "Child date of birth", type: "date", required: true, options: null, source: "inferred: student record", section: "Child" },
  { name: "student.gender", label: "Gender", type: "select", required: true, options: ["Male", "Female", "Non - Binary"], source: "inferred: values seen on student records", section: "Child" },
  { name: "student.grade", label: "Grade applying for", type: "select", required: true, options: ["PreK 2", "PreK 3", "PreK 4", "Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"], source: "inferred: values seen (Grade 11/12 assumed, not seen in sample)", section: "Child" },
  { name: "student.enrollment_year", label: "Entry year", type: "select", required: true, options: ["2026", "2027"], source: "inferred: student.enrollment_year", section: "Child" },
  { name: "student.custom_fields.enrollment_month", label: "Entry month", type: "select", required: false, options: null, source: "inferred: often filled on tour registrants; options unknown", section: "Child" },
  { name: "student.custom_fields.thai_nickname", label: "Child nickname", type: "text", required: false, options: null, source: "inferred", section: "Child" },
  { name: "student.custom_fields.nationality", label: "Child nationality", type: "select", required: false, options: null, source: "inferred", section: "Child" },
  { name: "student.custom_fields.current_school", label: "Current school", type: "text", required: false, options: null, source: "inferred", section: "Child" },
  { name: "student.custom_fields.referral_source_custom", label: "How did you hear about us?", type: "multiselect", required: false, options: ["Friends", "RIS Website", "Google Search", "Other"], source: "inferred: only these values seen; full list not exposed. 'Other' pairs with referral_source_if_other", section: "Child" },
  { name: "student.custom_fields.referral_source_if_other", label: "If other, please specify", type: "text", required: false, options: null, source: "inferred", section: "Child" },
  { name: "student.custom_fields.reasons_for_applying", label: "Reasons for applying", type: "multiselect", required: false, options: null, source: "inferred", section: "Child" },
  { name: "parent.first_name", label: "Parent first name", type: "text", required: true, options: null, source: "inferred: embedded parent_guardian", section: "Parent" },
  { name: "parent.last_name", label: "Parent last name", type: "text", required: true, options: null, source: "inferred", section: "Parent" },
  { name: "parent.email", label: "Parent email", type: "email", required: true, options: null, source: "inferred", section: "Parent" },
  { name: "parent.custom_fields.mobile_phone", label: "Mobile phone", type: "tel", required: true, options: null, source: "inferred: present on ~all parents", section: "Parent" },
  { name: "parent.parent_role", label: "Relationship to child", type: "select", required: true, options: ["Mother", "Father", "Stepfather", "Grandmother", "Aunt", "Brother", "Other"], source: "inferred: values seen", section: "Parent" },
  { name: "parent.gender", label: "Parent gender", type: "select", required: false, options: ["Male", "Female"], source: "inferred", section: "Parent" },
  { name: "parent.custom_fields.nationality", label: "Parent nationality", type: "select", required: false, options: null, source: "inferred", section: "Parent" },
  { name: "parent.custom_fields.how_can_we_help", label: "How can we help?", type: "textarea", required: false, options: null, source: "inferred: rarely filled", section: "Parent" },
];
