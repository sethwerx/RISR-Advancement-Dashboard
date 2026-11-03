import { createElement } from "react";
import type { TabDefinition } from "@/tabs/types";
import { OfficeScreen } from "@/tabs/office/OfficeScreen";

export const alumniTab: TabDefinition = {
  id: "alumni",
  label: "Alumni",
  href: "/alumni",
  enabled: true,
  description: "Graduates from the latest alumni database and OpenApply.",
  Component: function AlumniScreen() {
    return createElement(OfficeScreen, { tab: "alumni" });
  },
};
