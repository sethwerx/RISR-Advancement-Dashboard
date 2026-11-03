import type { TabDefinition } from "@/tabs/types";
import { ScholarshipsScreen } from "@/tabs/scholarships/ScholarshipsScreen";

export const scholarshipsTab: TabDefinition = {
  id: "scholarships",
  label: "Scholarships",
  href: "/scholarships",
  enabled: true,
  description: "Applicant, grade, scholarship type, amount or percent, and status. Sample data only.",
  Component: ScholarshipsScreen,
};
