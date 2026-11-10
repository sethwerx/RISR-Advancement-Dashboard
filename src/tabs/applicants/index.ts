import { createElement } from "react";
import type { TabDefinition } from "@/tabs/types";
import { OfficeScreen } from "@/tabs/office/OfficeScreen";

export const applicantsTab: TabDefinition = {
  id: "applicants",
  label: "Applicants",
  href: "/applicants",
  enabled: true,
  description: "OpenApply pending and applied students, joined to the Notion pipeline.",
  Component: function ApplicantsScreen() {
    return createElement(OfficeScreen, { tab: "applicants" });
  },
};
