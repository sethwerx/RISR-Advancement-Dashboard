import { createElement } from "react";
import type { TabDefinition } from "@/tabs/types";
import { OfficeScreen } from "@/tabs/office/OfficeScreen";

export const scholarshipsTab: TabDefinition = {
  id: "scholarships",
  label: "Scholarships",
  href: "/scholarships",
  enabled: true,
  description: "Finance scholarship list, with a data-as-of date.",
  Component: function ScholarshipsScreen() {
    return createElement(OfficeScreen, { tab: "scholarships" });
  },
};
