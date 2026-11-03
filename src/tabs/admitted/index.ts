import { createElement } from "react";
import type { TabDefinition } from "@/tabs/types";
import { OfficeScreen } from "@/tabs/office/OfficeScreen";

export const admittedTab: TabDefinition = {
  id: "admitted",
  label: "Admitted",
  href: "/admitted",
  enabled: true,
  description: "Admitted students and the admit-to-enroll yield.",
  Component: function AdmittedScreen() {
    return createElement(OfficeScreen, { tab: "admitted" });
  },
};
