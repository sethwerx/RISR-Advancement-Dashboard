import { createElement } from "react";
import type { TabDefinition } from "@/tabs/types";
import { OfficeScreen } from "@/tabs/office/OfficeScreen";

export const assessmentsTab: TabDefinition = {
  id: "assessments",
  label: "Assessments",
  href: "/assessments",
  enabled: true,
  description: "Assessment status from Notion and OpenApply tags.",
  Component: function AssessmentsScreen() {
    return createElement(OfficeScreen, { tab: "assessments" });
  },
};
