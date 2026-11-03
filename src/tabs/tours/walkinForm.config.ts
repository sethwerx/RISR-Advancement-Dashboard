/**
 * Placeholder schema for the walk-in tour form.
 * Replace this list with the OpenApply tour booking fields when they arrive.
 * The form renders only what is declared here.
 */
export type WalkInFieldType = "text" | "email" | "tel" | "date" | "textarea" | "select";

export type WalkInField = {
  name: string;
  label: string;
  type: WalkInFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  section: "Parent" | "Student" | "Visit";
};

const GRADES = ["PreK", "KG", "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9", "G10", "G11", "G12"];

export const walkInFormFields: WalkInField[] = [
  { name: "parentFirstName", label: "Parent first name", type: "text", required: true, section: "Parent", placeholder: "First name" },
  { name: "parentLastName", label: "Parent last name", type: "text", required: true, section: "Parent", placeholder: "Last name" },
  { name: "email", label: "Email", type: "email", required: true, section: "Parent", placeholder: "name@example.com" },
  { name: "phone", label: "Phone", type: "tel", required: true, section: "Parent", placeholder: "+66" },
  { name: "studentFirstName", label: "Student first name", type: "text", required: true, section: "Student", placeholder: "First name" },
  { name: "studentPreferredName", label: "Preferred name", type: "text", section: "Student", placeholder: "Name they go by" },
  { name: "studentLastName", label: "Student last name", type: "text", required: true, section: "Student", placeholder: "Last name" },
  { name: "dateOfBirth", label: "Date of birth", type: "date", required: true, section: "Student" },
  { name: "gradeApplyingFor", label: "Grade applying for", type: "select", required: true, section: "Student", options: GRADES },
  { name: "intendedStartDate", label: "Intended start date", type: "date", required: true, section: "Student" },
  {
    name: "hearAbout",
    label: "How did you hear about us",
    type: "select",
    required: true,
    section: "Visit",
    options: [
      "School website",
      "Current family referral",
      "Education agent",
      "Open house",
      "Social media",
      "Relocation company",
      "Embassy / corporate HR",
      "Walk-in",
      "Other",
    ],
  },
  { name: "notes", label: "Notes", type: "textarea", section: "Visit", placeholder: "Anything the family mentioned at the desk" },
];
