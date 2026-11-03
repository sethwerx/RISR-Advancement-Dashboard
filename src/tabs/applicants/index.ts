import type { TabDefinition } from "@/tabs/types";
import { ApplicantsScreen } from "@/tabs/applicants/ApplicantsScreen";

export const applicantsTab: TabDefinition = {
  id: "applicants",
  label: "Applicants",
  href: "/applicants",
  enabled: true,
  description: "School Admission Pipeline. Sample data only until the live source is specified.",
  Component: ApplicantsScreen,
};
